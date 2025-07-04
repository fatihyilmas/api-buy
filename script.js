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
    const copyAddressButton = document.getElementById('copy-address');
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

    // Ödeme detaylarını gösterme fonksiyonu
    function displayPaymentDetails(data) {
        // Görünümleri değiştir
        donationView.classList.add('hidden');
        paymentView.classList.remove('hidden');

        // Bilgileri doldur
        paymentNetwork.textContent = data.network ? data.network.toUpperCase() : (data.pay_currency.includes('usdt') ? 'TRC-20' : 'TRON');
        paymentAmount.textContent = `${data.pay_amount} ${data.pay_currency.toUpperCase()}`;
        paymentAddress.textContent = data.pay_address;

        // QR Kodu oluştur
        qrcodeDiv.innerHTML = '';
        const qr = qrcode(0, 'M');
        qr.addData(data.pay_address);
        qr.make();
        qrcodeDiv.innerHTML = qr.createImgTag(6, 8); // Boyut ve kenar boşluğu

        // Ödeme durumunu kontrol etmeye başla
        startPolling(data.payment_id);
    }

    // Adresi kopyalama butonu
    copyAddressButton.addEventListener('click', () => {
        const address = paymentAddress.textContent;
        navigator.clipboard.writeText(address).then(() => {
            showNotification('Adres panoya kopyalandı!');
            
            // İkonu değiştir ve geri al
            copyIcon.removeAttribute('data-lucide');
            copyIcon.setAttribute('data-lucide', 'check');
            lucide.createIcons();

            setTimeout(() => {
                copyIcon.removeAttribute('data-lucide');
                copyIcon.setAttribute('data-lucide', 'copy');
                lucide.createIcons();
            }, 2000);

        }).catch(err => {
            showNotification('Adres kopyalanamadı.', 'error');
            console.error('Metin kopyalanamadı: ', err);
        });
    });

    // Ödeme durumunu periyodik olarak kontrol etme
    function startPolling(paymentId) {
        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/check-payment?payment_id=${paymentId}`);
                const data = await response.json();

                // Ödeme tamamlandıysa
                if (['finished', 'confirmed', 'sending'].includes(data.payment_status)) {
                    clearInterval(pollingInterval);
                    showSuccessMessage();
                }
            } catch (error) {
                console.error('Ödeme durumu kontrol edilirken hata:', error);
                // İsteğe bağlı olarak burada kullanıcıya bir hata mesajı gösterilebilir
            }
        }, 10000); // Her 10 saniyede bir kontrol et
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
        
        // Bildirim tipine göre renk ayarı
        if (type === 'error') {
            notification.classList.remove('bg-green-500');
            notification.classList.add('bg-red-500');
        } else {
            notification.classList.remove('bg-red-500');
            notification.classList.add('bg-green-500');
        }

        // Bildirimi göster
        notification.classList.remove('opacity-0', 'translate-y-20');
        
        // 3 saniye sonra gizle
        setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-y-20');
        }, 3000);
    }

    // Sayfa yüklendiğinde ikonları oluştur
    lucide.createIcons();
});
