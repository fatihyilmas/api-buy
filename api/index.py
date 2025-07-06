import os
import json
import base64
import hashlib
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# --- DECRYPTION LOGIC ---
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

# --- VERCEL HANDLER ---
class handler(BaseHTTPRequestHandler):
    # Bu fonksiyon, GET ve POST isteklerini aynı şekilde işler.
    def _process(self):
        # DECRYPTION_KEY, Vercel ortam değişkenlerinden alınmalıdır.
        decryption_key = os.environ.get('DECRYPTION_KEY')
        if not decryption_key:
            self._send_response(500, {'error': True, 'message': 'Server configuration error: Missing decryption key.'})
            return

        try:
            # Şifreli iş mantığı dosyasını oku.
            # Bu dosyanın, bu betikle aynı dizinde olması beklenir.
            current_dir = os.path.dirname(__file__)
            encrypted_file_path = os.path.join(current_dir, 'business_logic.enc')
            with open(encrypted_file_path, 'rb') as f:
                encrypted_logic_b64 = f.read()
        except FileNotFoundError:
            self._send_response(500, {'error': True, 'message': 'Server configuration error: Encrypted logic file not found.'})
            return

        # İş mantığını deşifre et.
        decrypted_code = decrypt_logic(encrypted_logic_b64, decryption_key)

        if not decrypted_code:
            self._send_response(500, {'error': True, 'message': 'Server configuration error: Business logic could not be loaded. Check decryption key.'})
            return
        
        # Gerekli ortam değişkenlerini bir sözlükte topla.
        env = {
            "NOWPAYMENTS_API_KEY": os.environ.get('NOWPAYMENTS_API_KEY')
        }
        
        # Deşifre edilmiş kodu çalıştırmak için yerel bir kapsam oluştur.
        local_scope = {'request_handler': self, 'env': env}
        try:
            # Deşifre edilmiş kodu çalıştır ve içindeki 'execute_business_logic' fonksiyonunu çağır.
            exec(decrypted_code, globals(), local_scope)
            local_scope['execute_business_logic'](self, env)
        except Exception as e:
            self._send_response(500, {'error': True, 'message': f'Internal server error during logic execution: {str(e)}'})

    def do_GET(self):
        self._process()

    def do_POST(self):
        self._process()

    def _send_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
