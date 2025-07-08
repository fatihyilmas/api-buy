import os
import json
import base64
import hashlib
import hmac
import smtplib
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from email.message import EmailMessage

# --- E-posta ve Webhook Fonksiyonları ---

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

# --- Şifrelenmiş İş Mantığı Fonksiyonları ---

def derive_key(secret: str) -> bytes:
    salt = b'jbot_salt_v1'
    iterations = 100_000
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )
    return kdf.derive(secret.encode('utf-8'))

def decrypt_logic(encrypted_text_b64: bytes, secret: str) -> str | None:
    try:
        key = derive_key(secret)
        data = base64.b64decode(encrypted_text_b64)
        iv = data[:12]
        tag = data[12:28]
        ciphertext = data[28:]
        
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        return (decryptor.update(ciphertext) + decryptor.finalize()).decode('utf-8')
    except Exception:
        return None

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
        if payment_status == 'waiting':
            print(f"Waiting status bildirimi alındı: {data.get('payment_id')}")
            subject = f"Yeni Bekleyen Bağış: {data.get('price_amount')} {data.get('price_currency')}"
            html_body = create_html_email_body(data)
            sent, message = send_notification_email(subject, html_body)
            if not sent:
                # E-posta gönderilemezse bile NowPayments'e başarılı yanıt dön
                print(f"Email could not be sent: {message}")
        else:
            print(f"Farklı bir statüde bildirim alındı ({payment_status}), e-posta gönderilmedi.")

        return self._send_response(200, "Webhook received successfully.", is_json=False)

    def _process_encrypted_logic(self):
        # --- Anında E-posta Gönderme Mantığı ---
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/create-payment':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                # Orijinal isteği bozmamak için veriyi yeniden okunabilir hale getir
                self.rfile = open(os.devnull, 'rb') # Dummy file to prevent re-reading
                
                # E-posta için veriyi işle
                payment_request_data = json.loads(post_data)
                email = payment_request_data.get('email', 'N/A')
                message = payment_request_data.get('message', 'N/A')
                
                price_amount = payment_request_data.get('price_amount', 'N/A')
                pay_amount = payment_request_data.get('pay_amount', 'N/A')
                pay_currency = payment_request_data.get('pay_currency', 'N/A')

                # E-posta için sahte bir NowPayments veri yapısı oluştur
                email_payload = {
                    'payment_status': 'waiting',
                    'payment_id': 'Oluşturuluyor...',
                    'price_amount': price_amount if price_amount else 'Kripto',
                    'price_currency': 'usd' if price_amount else '',
                    'pay_amount': pay_amount if pay_amount else 'Hesaplanıyor...',
                    'pay_currency': pay_currency,
                    'order_description': f"Donation from {email or 'Anonymous'}. Message: {message or 'None'}"
                }
                
                subject_amount = f"{price_amount} USD" if price_amount else f"{pay_amount} {pay_currency.upper()}"
                subject = f"Yeni Başlatılan Bağış: {subject_amount}"
                html_body = create_html_email_body(email_payload)
                send_notification_email(subject, html_body)

                # Orijinal isteği yeniden oluştur ve şifreli mantığa gönder
                # Bu kısım, şifreli kodun orijinal isteği almasını sağlar
                import io
                self.rfile = io.BytesIO(post_data)

            except Exception as e:
                print(f"Anında e-posta gönderme sırasında hata: {e}")
                # Hata olsa bile süreci durdurma, ödeme oluşturmaya devam et
        # --- Anında E-posta Mantığı Sonu ---

        decryption_key = os.environ.get('DECRYPTION_KEY')
        if not decryption_key:
            return self._send_response(500, {'error': True, 'message': 'Server configuration error: Missing decryption key.'})

        try:
            current_dir = os.path.dirname(__file__)
            encrypted_file_path = os.path.join(current_dir, 'business_logic.enc')
            with open(encrypted_file_path, 'rb') as f:
                encrypted_logic_b64 = f.read()
        except FileNotFoundError:
            return self._send_response(500, {'error': True, 'message': 'Server configuration error: Encrypted logic file not found.'})

        decrypted_code = decrypt_logic(encrypted_logic_b64, decryption_key)
        if not decrypted_code:
            return self._send_response(500, {'error': True, 'message': 'Server configuration error: Business logic could not be loaded. Check decryption key.'})
        
        env = {"API_KEY": os.environ.get('API_KEY'), "BASE_URL": os.environ.get('BASE_URL')}
        local_scope = {'request_handler': self, 'env': env}
        try:
            exec(decrypted_code, globals(), local_scope)
            local_scope['execute_business_logic'](self, env)
        except Exception as e:
            self._send_response(500, {'error': True, 'message': f'Internal server error during logic execution: {str(e)}'})

    def do_GET(self):
        # Gelen isteğin yolunu (path) al
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Yönlendirme
        if path == '/api/webhook':
            return self._send_response(200, "Webhook endpoint is listening for POST requests.", is_json=False)
        else:
            return self._process_encrypted_logic()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/webhook':
            return self._handle_webhook()
        else:
            return self._process_encrypted_logic()
