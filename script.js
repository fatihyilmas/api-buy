document.addEventListener('DOMContentLoaded', () => {
    // Gerekli DOM elementlerini seç
    const donationForm = document.getElementById('donation-form');
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
            currencySymbol = 'USDT'; // Görünen adı basitleştir
        }
        
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

    // GÜNCELLENDİ: Güvenilir kopyalama fonksiyonu
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification('Adres panoya kopyalandı!');
            
            // İkonu değiştir ve sonra lucide'ı çalıştır
            copyIcon.setAttribute('data-lucide', 'check');
            lucide.createIcons();

            setTimeout(() => {
                copyIcon.setAttribute('data-lucide', 'copy');
                lucide.createIcons();
            }, 2000);

        } catch (err) {
            console.error('Kopyalama başarısız oldu:', err);
            showNotification('Adres kopyalanamadı.', 'error');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    copyContainer.addEventListener('click', () => {
        const address = paymentAddress.textContent;
        if (address) {
            copyToClipboard(address);
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

    // Sayfa yüklendiğinde ikonları oluştur
    lucide.createIcons();
});
