import os
import json
import hmac
import hashlib
import smtplib
from http.server import BaseHTTPRequestHandler
from email.message import EmailMessage

def send_notification_email(subject, html_content):
    """
    Güvenli bir şekilde ortam değişkenlerinden alınan bilgilerle HTML e-posta gönderir.
    """
    sender_email = os.environ.get('SENDER_EMAIL')
    sender_password = os.environ.get('SENDER_PASSWORD')
    recipient_email = os.environ.get('RECIPIENT_EMAIL')

    if not all([sender_email, sender_password, recipient_email]):
        print("E-posta göndermek için gerekli ortam değişkenleri eksik.")
        return

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
    except Exception as e:
        print(f"E-posta gönderilirken hata oluştu: {e}")

def create_html_email_body(data):
    """
    Gelen verilerden modern bir HTML e-posta gövdesi oluşturur.
    """
    # Verileri güvenli bir şekilde al, eksikse "N/A" olarak işaretle
    status = data.get('payment_status', 'N/A').upper()
    payment_id = data.get('payment_id', 'N/A')
    price_amount = data.get('price_amount', 'N/A')
    price_currency = data.get('price_currency', '')
    pay_amount = data.get('pay_amount', 'N/A')
    pay_currency = data.get('pay_currency', '')
    
    # Order description'dan mail ve mesajı ayıkla
    order_description = data.get('order_description', '')
    user_email = "N/A"
    user_message = "N/A"
    
    try:
        # "from" ve "Message:" kelimelerini ayraç olarak kullan
        email_part = order_description.split(' from ')[1]
        user_email = email_part.split(' Message:')[0]
        user_message = order_description.split(' Message: ')[1]
    except IndexError:
        # Eğer format beklenenden farklıysa, tüm açıklamayı mesaja ata
        user_message = order_description

    # HTML ve CSS ile e-posta şablonu
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
        .status {{ font-weight: bold; padding: 5px 10px; border-radius: 15px; color: #fff; text-align: center; }}
        .status.waiting {{ background-color: #f39c12; }}
        .status.finished {{ background-color: #2ecc71; }}
        .message-box {{ background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; margin-top: 20px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }}
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
                <tr><td colspan="2">&nbsp;</td></tr>
                <tr><td>Kullanıcı E-posta:</td><td>{user_email}</td></tr>
            </table>
            <div class="message-box">
                <strong>Kullanıcı Mesajı:</strong>
                <p>{user_message}</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Güvenlik: IPN Gizli Anahtarını al
        ipn_secret_key = os.environ.get('IPN_SECRET_KEY') # Genel bir isim kullanıldı
        if not ipn_secret_key:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Server configuration error: IPN Secret Key not set.")
            return

        # 2. Güvenlik: Gelen isteğin imzasını doğrula
        try:
            signature = self.headers.get('x-nowpayments-sig')
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            # Dokümantasyona uygun imza doğrulama
            sorted_data = json.dumps(data, separators=(',', ':'), sort_keys=True)
            expected_signature = hmac.new(
                ipn_secret_key.encode(),
                sorted_data.encode(),
                hashlib.sha512
            ).hexdigest()

            if not hmac.compare_digest(expected_signature, signature):
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b"Forbidden: Invalid signature.")
                print(f"Signature mismatch. Expected: {expected_signature}, Got: {signature}")
                return
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(f"Bad Request: Signature verification failed. {e}".encode())
            return
            
        # 3. Veriyi işle
        payment_status = data.get('payment_status')

        # 4. İsteğe göre 'waiting' durumunu işle
        if payment_status == 'waiting':
            print(f"Waiting status bildirimi alındı: {data.get('payment_id')}")
            subject = f"Yeni Bekleyen Bağış: {data.get('price_amount')} {data.get('price_currency')}"
            html_body = create_html_email_body(data)
            send_notification_email(subject, html_body)
        else:
            print(f"Farklı bir statüde bildirim alındı ({payment_status}), e-posta gönderilmedi.")

        # 5. NowPayments'e başarılı yanıt gönder
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Webhook received successfully.")
        return
