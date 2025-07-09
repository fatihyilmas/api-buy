import os
import json
import hmac
import hashlib
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests

# --- Telegram Bildirim Fonksiyonu ---

def send_telegram_message(text):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')

    # --- HATA AYIKLAMA ---
    if bot_token:
        print(f"Kullanılan Token (ilk 5/son 5): {bot_token[:5]}...{bot_token[-5:]}")
    if chat_id:
        print(f"Kullanılan Chat ID: {chat_id}")
    # --- HATA AYIKLAMA SONU ---

    if not all([bot_token, chat_id]):
        print("Telegram için gerekli ortam değişkenleri eksik.")
        return False, "Server configuration error for Telegram."

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown'
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print("Telegram mesajı başarıyla gönderildi.")
        return True, "Telegram message sent."
    except requests.exceptions.RequestException as e:
        print(f"Telegram'a mesaj gönderilirken hata oluştu: {e}")
        return False, str(e)

def format_telegram_message(data):
    status = data.get('payment_status', 'N/A').upper()
    payment_id = data.get('payment_id', 'N/A')
    price_amount = data.get('price_amount', 'N/A')
    price_currency = data.get('price_currency', '').upper()
    pay_amount = data.get('pay_amount', 'N/A')
    pay_currency = data.get('pay_currency', '').upper()
    
    order_description = data.get('order_description', '')
    user_email, user_message = "N/A", "N/A"
    
    try:
        email_part = order_description.split(' from ')[1]
        user_email = email_part.split(' Message:')[0]
        user_message = order_description.split(' Message: ')[1]
    except IndexError:
        user_message = order_description

    # Mesaj Başlığı
    if status == 'WAITING':
        title = "⏳ YENİ BAŞLATILAN BAĞIŞ"
    elif status == 'FINISHED':
        title = "✅ BAĞIŞ TAMAMLANDI"
    else:
        title = f"🔔 YENİ BİLDİRİM: {status}"

    message = f"""
*{title}*

*Durum:* {status}
*Ödeme ID:* `{payment_id}`
*Talep Edilen Tutar:* {price_amount} {price_currency}
*Ödenen Tutar:* {pay_amount} {pay_currency}

---
*Kullanıcı Bilgileri*
*E-posta:* `{user_email}`
*Mesaj:*
`{user_message}`
"""
    return message.strip()


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
            
        # Telegram'a bildirim gönder
        telegram_text = format_telegram_message(data)
        sent, message = send_telegram_message(telegram_text)
        if not sent:
            print(f"Telegram message could not be sent: {message}")

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
                # Anında Telegram bildirimi gönder
                telegram_payload = {
                    'payment_status': 'waiting',
                    'payment_id': 'Oluşturuluyor...',
                    'price_amount': amount,
                    'price_currency': 'usd',
                    'pay_amount': 'Hesaplanıyor...',
                    'pay_currency': currency,
                    'order_description': f"Donation: {amount} USD from {email or 'Anonymous'}. Message: {message or 'None'}"
                }
                telegram_text = format_telegram_message(telegram_payload)
                send_telegram_message(telegram_text)

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
