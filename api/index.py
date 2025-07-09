import os
import json
import hmac
import hashlib
import smtplib
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
from email.message import EmailMessage

# --- E-posta Fonksiyonları ---

def send_notification_email(subject, html_content):
    sender_email = os.environ.get('SENDER_EMAIL')
    sender_password = os.environ.get('SENDER_PASSWORD')
    recipient_email = os.environ.get('RECIPIENT_EMAIL')

    if not all([sender_email, sender_password, recipient_email]):
        print("E-posta göndermek için gerekli ortam değişkenleri eksik.")
        return False, "Server configuration error for email."

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg.set_content("Lütfen HTML destekleyen bir e-posta istemcisi kullanın.")
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
            print("Bildirim e-postası başarıyla gönderildi.")
            return True, "Email sent."
    except Exception as e:
        print(f"E-posta gönderilirken hata oluştu: {e}")
        return False, str(e)

def create_html_email_body(data):
    status = data.get('payment_status', 'N/A').upper()
    payment_id = data.get('payment_id', 'N/A')
    price_amount = data.get('price_amount', 'N/A')
    price_currency = data.get('price_currency', '')
    pay_amount = data.get('pay_amount', 'N/A')
    pay_currency = data.get('pay_currency', '')
    
    order_description = data.get('order_description', '')
    user_email, user_message = "N/A", "N/A"
    
    try:
        email_part = order_description.split(' from ')[1]
        user_email = email_part.split(' Message:')[0]
        user_message = order_description.split(' Message: ')[1]
    except IndexError:
        user_message = order_description

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f7f6; }}
        .container {{ background-color: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
        .header {{ font-size: 24px; font-weight: 600; color: #333; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }}
        .table {{ width: 100%; border-collapse: collapse; }}
        .table td {{ padding: 12px 0; border-bottom: 1px solid #f0f0f0; }}
        .table td:first-child {{ font-weight: 600; color: #555; width: 150px; }}
        .status {{ font-weight: bold; padding: 5px 10px; border-radius: 15px; color: #fff; text-align: center; display: inline-block; }}
        .status.waiting {{ background-color: #f39c12; }}
        .status.finished {{ background-color: #2ecc71; }}
        .user-info {{ background-color: #f9f9f9; border: 1px solid #eee; padding: 20px; margin-top: 20px; border-radius: 5px; }}
        .user-info strong {{ display: block; color: #333; margin-bottom: 5px; }}
        .user-info p {{ margin: 0 0 15px 0; padding-left: 10px; border-left: 3px solid #ddd; color: #666; }}
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">Yeni Ödeme Bildirimi</div>
            <table class="table">
                <tr><td>Durum:</td><td><span class="status {status.lower()}">{status}</span></td></tr>
                <tr><td>Ödeme ID:</td><td>{payment_id}</td></tr>
                <tr><td>Talep Edilen Tutar:</td><td>{price_amount} {price_currency}</td></tr>
                <tr><td>Ödenen Tutar:</td><td>{pay_amount} {pay_currency}</td></tr>
            </table>
            <div class="user-info">
                <strong>Kullanıcı E-posta:</strong>
                <p>{user_email}</p>
                <strong>Kullanıcı Mesajı:</strong>
                <p>{user_message}</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

# --- Ana Handler Sınıfı ---

class handler(BaseHTTPRequestHandler):
    def _send_response(self, status_code, data, is_json=True):
        self.send_response(status_code)
        if is_json:
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))

    def _handle_webhook(self):
        ipn_secret_key = os.environ.get('IPN_SECRET_KEY')
        if not ipn_secret_key:
            return self._send_response(500, "Server configuration error: IPN Secret Key not set.", is_json=False)

        try:
            signature = self.headers.get('x-nowpayments-sig')
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            sorted_data = json.dumps(data, separators=(',', ':'), sort_keys=True)
            expected_signature = hmac.new(ipn_secret_key.encode(), sorted_data.encode(), hashlib.sha512).hexdigest()

            if not hmac.compare_digest(expected_signature, signature):
                print(f"Signature mismatch. Expected: {expected_signature}, Got: {signature}")
                return self._send_response(403, "Forbidden: Invalid signature.", is_json=False)
        except Exception as e:
            return self._send_response(400, f"Bad Request: Signature verification failed. {e}", is_json=False)
            
        payment_status = data.get('payment_status')
        subject = f"Yeni Bağış Bildirimi ({payment_status.upper()}): {data.get('price_amount')} {data.get('price_currency')}"
        html_body = create_html_email_body(data)
        sent, message = send_notification_email(subject, html_body)
        if not sent:
            print(f"Email could not be sent: {message}")

        return self._send_response(200, "Webhook received successfully.", is_json=False)

    def _handle_business_logic(self):
        api_key = os.environ.get('API_KEY')
        base_url = os.environ.get('BASE_URL')
        if not api_key or not base_url:
            self._send_response(500, {'error': True, 'message': 'Server configuration error: Missing API key or base URL.'})
            return

        api_client = requests.Session()
        api_client.headers.update({
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        })

        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)

        if path.endswith('/create-payment'):
            if self.command != 'POST':
                self._send_response(405, {'error': True, 'message': 'Only POST requests are accepted.'})
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data)
            
            amount = body.get('amount')
            currency = body.get('currency')
            email = body.get('email')
            message = body.get('message')

            if not all([amount, currency]):
                self._send_response(400, {'error': True, 'message': 'Amount and currency fields are required.'})
                return
            
            try:
                # Anında e-posta gönderimi
                email_payload = {
                    'payment_status': 'waiting',
                    'payment_id': 'Oluşturuluyor...',
                    'price_amount': amount,
                    'price_currency': 'usd',
                    'pay_amount': 'Hesaplanıyor...',
                    'pay_currency': currency,
                    'order_description': f"Donation: {amount} USD from {email or 'Anonymous'}. Message: {message or 'None'}"
                }
                subject = f"Yeni Başlatılan Bağış: {amount} USD"
                html_body = create_html_email_body(email_payload)
                send_notification_email(subject, html_body)

                # Ödeme sağlayıcısı API'sine istek
                response = api_client.post(f"{base_url}payment", json={
                    'price_amount': amount,
                    'price_currency': 'usd',
                    'pay_currency': currency,
                    'order_description': f"Donation: {amount} USD from {email or 'Anonymous'}. Message: {message or 'None'}"
                })
                response.raise_for_status()
                self._send_response(200, response.json())
            except requests.exceptions.RequestException as e:
                error_data = e.response.json() if e.response else {'message': str(e)}
                self._send_response(500, {'error': True, 'message': 'Payment service communication failed.', 'details': error_data})
            return

        elif path.endswith('/check-payment'):
            payment_id = query_params.get('payment_id', [None])[0]
            if not payment_id:
                self._send_response(400, {'error': True, 'message': 'payment_id parameter is required.'})
                return
            
            try:
                response = api_client.get(f"{base_url}payment/{payment_id}")
                response.raise_for_status()
                self._send_response(200, response.json())
            except requests.exceptions.RequestException as e:
                error_data = e.response.json() if e.response else {'message': str(e)}
                self._send_response(500, {'error': True, 'message': 'Failed to check payment status.', 'details': error_data})
            return
            
        elif path.endswith('/get-min-amount'):
            currency_from = query_params.get('currency_from', [None])[0]
            if not currency_from:
                self._send_response(400, {'error': True, 'message': 'currency_from parameter is required.'})
                return
                
            try:
                response = api_client.get(f"{base_url}min-amount", params={'currency_from': currency_from, 'currency_to': 'usd'})
                response.raise_for_status()
                self._send_response(200, response.json())
            except requests.exceptions.RequestException as e:
                error_data = e.response.json() if e.response else {'message': str(e)}
                self._send_response(500, {'error': True, 'message': 'Failed to get minimum amount.', 'details': error_data})
            return

        self._send_response(404, {'error': True, 'message': 'Endpoint not found.'})

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/webhook':
            self._send_response(200, "Webhook endpoint is listening for POST requests.", is_json=False)
        else:
            self._handle_business_logic()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/webhook':
            self._handle_webhook()
        else:
            self._handle_business_logic()
