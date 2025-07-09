import requests
import json
import time

API_KEY = "6B30P2E-D7W431B-M4VMSP7-RXP5KJA" 
BASE_URL = "https://api.nowpayments.io/v1/"

# Önbellekleme için bir sözlük
CURRENCY_CACHE = None

def get_all_currencies_with_networks():
    """
    Tüm para birimlerini ve ağ bilgilerini API'den alır ve önbelleğe kaydeder.
    """
    global CURRENCY_CACHE
    if CURRENCY_CACHE is not None:
        return CURRENCY_CACHE

    headers = {"x-api-key": API_KEY}
    url = f"{BASE_URL}full-currencies"
    
    print("Para birimi listesi API'den alınıyor (bu işlem bir kere yapılır)...")
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        CURRENCY_CACHE = response.json().get('currencies', [])
        print("Liste başarıyla alındı.")
        return CURRENCY_CACHE
    except requests.exceptions.RequestException as e:
        print(f"Hata: Para birimi listesi alınamadı. - {e}")
        return None

def find_and_get_min_amounts(search_term):
    """
    Belirli bir arama terimine uyan coinleri bulur ve minimum tutarlarını alır.
    """
    search_term = search_term.lower()
    all_currencies = get_all_currencies_with_networks()

    if all_currencies is None:
        return

    # Arama terimine uyan coinleri filtrele
    matching_currencies = [
        c for c in all_currencies 
        if search_term in c.get('code', '').lower() or search_term in c.get('name', '').lower()
    ]

    if not matching_currencies:
        print(f"'{search_term}' için eşleşen bir para birimi bulunamadı.")
        return

    print(f"'{search_term}' için {len(matching_currencies)} eşleşme bulundu. Minimum tutarlar sorgulanıyor...")
    
    headers = {"x-api-key": API_KEY}
    url = f"{BASE_URL}min-amount"
    
    print("\n--- SONUÇLAR ---")
    print(f"{'Sembol':<15} | {'İsim':<25} | {'Ağ':<15} | {'Minimum Tutar'}")
    print("-" * 75)

    for currency in matching_currencies:
        code = currency.get('code')
        name = currency.get('name')
        network = currency.get('network')

        if not code:
            continue

        params = {'currency_from': code}
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            min_amount = response.json().get('min_amount', 'N/A')
            
            print(f"{code:<15} | {name:<25} | {network:<15} | {min_amount}")

        except requests.exceptions.RequestException:
            # Hata durumunda bile satırı yazdır, ama hata mesajıyla
            print(f"{code:<15} | {name:<25} | {network:<15} | {'Sorgulanamadı'}")
        
        time.sleep(0.1) # API limitlerine takılmamak için bekleme

if __name__ == "__main__":
    # Betik başlarken tüm para birimlerini bir kereye mahsus çek
    get_all_currencies_with_networks()
    
    while True:
        try:
            search = input("\nMinimum tutarını öğrenmek istediğiniz coini girin (çıkmak için 'q'): ")
            if search.lower() == 'q':
                break
            if not search:
                continue
            
            find_and_get_min_amounts(search)

        except KeyboardInterrupt:
            print("\nÇıkış yapılıyor.")
            break
