document.addEventListener('DOMContentLoaded', () => {
    // Gerekli DOM elementlerini seç
    const donationForm = document.getElementById('donation-form');
    const amountInput = document.getElementById('amount');
    const donateButton = document.getElementById('donate-button');
    const buttonText = document.getElementById('button-text');
    const buttonLoader = document.getElementById('button-loader');

    const donationView = document.getElementById('donation-view');
    const paymentView = document.getElementById('payment-view');
    const successView = document.getElementById('success-view');

    const paymentNetwork = document.getElementById('payment-network');
    const paymentAmount = document.getElementById('payment-amount');
    const paymentAddress = document.getElementById('payment-address');
    const qrcodeDiv = document.getElementById('qrcode');
    
    const copyContainer = document.getElementById('copy-container');
    const copyIcon = document.getElementById('copy-icon');

    let pollingInterval;

    // Miktar alanından odak çıkınca minimum değeri kontrol et
    amountInput.addEventListener('blur', () => {
        const value = parseFloat(amountInput.value);
        // Değer varsa ve 10'dan küçükse, 10'a ayarla
        if (amountInput.value && value < 10) {
            amountInput.value = 10;
        }
    });

    // Bağış formu gönderildiğinde
    donationForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Butonu yüklenme durumuna getir
        donateButton.disabled = true;
        buttonText.textContent = 'Oluşturuluyor...';
        buttonLoader.classList.remove('hidden');

        // Form verilerini al
        const amount = document.getElementById('amount').value;
        const currency = document.querySelector('input[name="currency"]:checked').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        try {
            // API'ye ödeme oluşturma isteği gönder
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency, email, message })
            });

            const data = await response.json();

            if (response.ok) {
                // Başarılı olursa ödeme detaylarını göster
                displayPaymentDetails(data);
            } else {
                // Hata olursa bildir
                showNotification(`Hata: ${data.message}`, 'error');
                resetButton();
            }
        } catch (error) {
            console.error('Beklenmedik bir hata oluştu:', error);
            showNotification('Beklenmedik bir hata oluştu.', 'error');
            resetButton();
        }
    });

    // GÜNCELLENDİ: Ödeme detaylarını gösterme fonksiyonu
    function displayPaymentDetails(data) {
        // Görünümleri değiştir
        donationView.classList.add('hidden');
        paymentView.classList.remove('hidden');

        // GÜNCELLENDİ: Daha esnek para birimi ve ağ adı yönetimi
        let currencySymbol = data.pay_currency.toUpperCase();
        if (currencySymbol === 'USDTTRC20') {
            currencySymbol = 'USDT';
        } else if (currencySymbol === 'BNBBSC') { // NowPayments genellikle ağı bu şekilde belirtir
            currencySymbol = 'BNB';
        }
        // LTC için genellikle sadece 'LTC' döner, bu yüzden ekstra bir kontrole gerek yok.
        
        const networkName = data.network.toUpperCase();

        // Bilgileri doğru şekilde doldur
        paymentNetwork.textContent = networkName;
        paymentAmount.textContent = `${data.pay_amount} ${currencySymbol}`;
        paymentAddress.textContent = data.pay_address;

        // QR Kodu oluştur
        qrcodeDiv.innerHTML = '';
        const qr = qrcode(0, 'M');
        qr.addData(data.pay_address);
        qr.make();
        qrcodeDiv.innerHTML = qr.createImgTag(6, 8);

        // Ödeme durumunu kontrol etmeye başla
        startPolling(data.payment_id);
    }

    // GÜNCELLENDİ: Modern ve daha güvenilir kopyalama fonksiyonu
    async function copyToClipboard(text) {
        // Modern `navigator.clipboard` API'sini kullan
        if (!navigator.clipboard) {
            showNotification('Kopyalama bu tarayıcıda desteklenmiyor.', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            showNotification('Adres panoya kopyalandı!');

            // İkonu 'check' olarak değiştir ve lucide'ı çalıştır
            copyIcon.setAttribute('data-lucide', 'check');
            if (window.lucide) {
                lucide.createIcons();
            }

            // 2 saniye sonra ikonu eski haline getir
            setTimeout(() => {
                copyIcon.setAttribute('data-lucide', 'copy');
                if (window.lucide) {
                    lucide.createIcons();
                }
            }, 2000);

        } catch (err) {
            console.error('Kopyalama başarısız oldu:', err);
            showNotification('Adres kopyalanamadı.', 'error');
        }
    }

    copyContainer.addEventListener('click', async () => {
        const address = paymentAddress.textContent;
        if (address) {
            await copyToClipboard(address);
        }
    });

    // Ödeme durumunu periyodik olarak kontrol etme
    function startPolling(paymentId) {
        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/check-payment?payment_id=${paymentId}`);
                const data = await response.json();

                if (['finished', 'confirmed', 'sending'].includes(data.payment_status)) {
                    clearInterval(pollingInterval);
                    showSuccessMessage();
                }
            } catch (error) {
                console.error('Ödeme durumu kontrol edilirken hata:', error);
            }
        }, 10000);
    }

    // Başarı mesajını göster
    function showSuccessMessage() {
        paymentView.classList.add('hidden');
        successView.classList.remove('hidden');
    }
    
    // Butonu varsayılan durumuna döndür
    function resetButton() {
        donateButton.disabled = false;
        buttonText.textContent = 'Bağış Yap';
        buttonLoader.classList.add('hidden');
    }

    // Bildirim gösterme fonksiyonu
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notificationMessage.textContent = message;
        
        if (type === 'error') {
            notification.classList.remove('bg-green-500');
            notification.classList.add('bg-red-500');
        } else {
            notification.classList.remove('bg-red-500');
            notification.classList.add('bg-green-500');
        }

        notification.classList.remove('opacity-0', 'translate-y-20');
        
        setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-y-20');
        }, 3000);
    }

    // Sayfa yüklendiğinde ve lucide hazır olduğunda ikonları oluştur
    if (window.lucide) {
        lucide.createIcons();
    } else {
        // Eğer lucide hemen hazır değilse, bir gecikme ile tekrar dene
        setTimeout(() => {
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 100);
    }
});
