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

# --- DECRYPTION LOGIC (Consistent with other APIs) ---
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

def decrypt_logic(encrypted_text: str, secret: str) -> str | None:
    try:
        key = derive_key(secret)
        data = base64.b64decode(encrypted_text)
        iv = data[:12]
        tag = data[12:28]
        ciphertext = data[28:]
        
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        return (decryptor.update(ciphertext) + decryptor.finalize()).decode('utf-8')
    except Exception:
        return None

# --- BUSINESS LOGIC (This will be encrypted) ---
def execute_business_logic(request_handler, env):
    nowpayments_api_key = env.get('NOWPAYMENTS_API_KEY')
    if not nowpayments_api_key:
        request_handler._send_response(500, {'error': True, 'message': 'Server configuration error: Missing payment API key.'})
        return

    api_client = requests.Session()
    api_client.headers.update({
        'x-api-key': nowpayments_api_key,
        'Content-Type': 'application/json'
    })
    base_url = 'https://api.nowpayments.io/v1/'

    parsed_path = urlparse(request_handler.path)
    path = parsed_path.path
    query_params = parse_qs(parsed_path.query)

    # --- ROUTE: /api/create-payment ---
    if path.endswith('/create-payment'):
        if request_handler.command != 'POST':
            request_handler._send_response(405, {'error': True, 'message': 'Only POST requests are accepted.'})
            return
        
        content_length = int(request_handler.headers['Content-Length'])
        post_data = request_handler.rfile.read(content_length)
        body = json.loads(post_data)
        
        amount = body.get('amount')
        currency = body.get('currency')
        email = body.get('email')
        message = body.get('message')

        # Validation
        if not all([amount, currency]):
            request_handler._send_response(400, {'error': True, 'message': 'Amount and currency fields are required.'})
            return
        
        try:
            response = api_client.post(f"{base_url}payment", json={
                'price_amount': amount,
                'price_currency': 'usd',
                'pay_currency': currency,
                'order_description': f"Donation: {amount} USD from {email or 'Anonymous'}. Message: {message or 'None'}"
            })
            response.raise_for_status()
            request_handler._send_response(200, response.json())
        except requests.exceptions.RequestException as e:
            error_data = e.response.json() if e.response else {'message': str(e)}
            request_handler._send_response(500, {'error': True, 'message': 'Payment service communication failed.', 'details': error_data})
        return

    # --- ROUTE: /api/check-payment ---
    elif path.endswith('/check-payment'):
        payment_id = query_params.get('payment_id', [None])[0]
        if not payment_id:
            request_handler._send_response(400, {'error': True, 'message': 'payment_id parameter is required.'})
            return
        
        try:
            response = api_client.get(f"{base_url}payment/{payment_id}")
            response.raise_for_status()
            request_handler._send_response(200, response.json())
        except requests.exceptions.RequestException as e:
            error_data = e.response.json() if e.response else {'message': str(e)}
            request_handler._send_response(500, {'error': True, 'message': 'Failed to check payment status.', 'details': error_data})
        return
        
    # --- ROUTE: /api/get-min-amount ---
    elif path.endswith('/get-min-amount'):
        currency_from = query_params.get('currency_from', [None])[0]
        if not currency_from:
            request_handler._send_response(400, {'error': True, 'message': 'currency_from parameter is required.'})
            return
            
        try:
            response = api_client.get(f"{base_url}min-amount", params={'currency_from': currency_from, 'currency_to': 'usd'})
            response.raise_for_status()
            request_handler._send_response(200, response.json())
        except requests.exceptions.RequestException as e:
            error_data = e.response.json() if e.response else {'message': str(e)}
            request_handler._send_response(500, {'error': True, 'message': 'Failed to get minimum amount.', 'details': error_data})
        return

    # --- Fallback for unknown routes ---
    request_handler._send_response(404, {'error': True, 'message': 'Endpoint not found.'})


# --- VERCEL HANDLER (This part remains unencrypted) ---
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.process_request()

    def do_POST(self):
        self.process_request()

    def process_request(self):
        # Python API'leri için standartlaştırılmış ortam değişkeni adlarını kullan
        encrypted_logic = os.environ.get('ENCRYPTED_PYTHON_LOGIC')
        decryption_key = os.environ.get('DECRYPTION_KEY_PYTHON')

        if not all([encrypted_logic, decryption_key]):
            self._send_response(500, {'error': True, 'message': 'Server configuration error: Missing encryption keys.'})
            return

        decrypted_code = decrypt_logic(encrypted_logic, decryption_key)

        if not decrypted_code:
            self._send_response(500, {'error': True, 'message': 'Server configuration error: Business logic could not be loaded.'})
            return
        
        env = {
            "NOWPAYMENTS_API_KEY": os.environ.get('NOWPAYMENTS_API_KEY')
        }
        
        local_scope = {'request_handler': self, 'env': env}
        try:
            exec(decrypted_code, globals(), local_scope)
            local_scope['execute_business_logic'](self, env)
        except Exception as e:
            self._send_response(500, {'error': True, 'message': f'Internal server error: {str(e)}'})

    def _send_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
