document.addEventListener('DOMContentLoaded', () => {
    // --- I18N (Internationalization) Setup ---
    const supportedLangs = ['en', 'tr'];
    const defaultLang = 'en';
    let currentTranslations = {};

    // Embed translations directly into the script
    const translations = {
        en: {
            "support_project": "Support the Project",
            "support_valuable": "Your support is very valuable for the development and sustainability of our project.",
            "have_idea": "Have an Idea?",
            "idea_description": "Want a new feature or have a suggestion? Let us know by adding your note in the 'Message' section. We prioritize developments based on these requests!",
            "amount_placeholder": "Donation Amount (Min 10 USD)",
            "email_placeholder": "E-mail (Optional)",
            "message_placeholder": "Your Message (Optional)",
            "donate_button": "Donate",
            "button_creating": "Creating...",
            "complete_payment": "Complete the Payment",
            "network": "Network",
            "amount": "Amount",
            "wallet_address": "Wallet Address",
            "waiting_for_payment": "Waiting for payment confirmation...",
            "thank_you": "Thank You!",
            "donation_successful": "Your donation has been received successfully. Your support is very valuable to us.",
            "address_copied": "Address copied to clipboard!",
            "copy_failed": "Failed to copy address."
        },
        tr: {
            "support_project": "Projeyi Destekle",
            "support_valuable": "Desteğiniz, projemizin geliştirilmesi ve sürdürülebilirliği için çok değerlidir.",
            "have_idea": "Bir Fikrin mi Var?",
            "idea_description": "Yeni bir özellik mi istiyorsunuz veya bir öneriniz mi var? 'Mesaj' bölümüne notunuzu ekleyerek bize bildirin. Geliştirmeleri bu isteklere göre önceliklendiriyoruz!",
            "amount_placeholder": "Bağış Miktarı (Min 10 USD)",
            "email_placeholder": "E-posta (İsteğe Bağlı)",
            "message_placeholder": "Mesajınız (İsteğe Bağlı)",
            "donate_button": "Bağış Yap",
            "button_creating": "Oluşturuluyor...",
            "complete_payment": "Ödemeyi Tamamlayın",
            "network": "Ağ",
            "amount": "Miktar",
            "wallet_address": "Cüzdan Adresi",
            "waiting_for_payment": "Ödeme onayı bekleniyor...",
            "thank_you": "Teşekkürler!",
            "donation_successful": "Bağışınız başarıyla alındı. Desteğiniz bizim için çok değerli.",
            "address_copied": "Adres panoya kopyalandı!",
            "copy_failed": "Adres kopyalanamadı."
        }
    };

    const languageSelector = document.getElementById('language-selector');

    const applyTranslations = (lang) => {
        currentTranslations = translations[lang] || translations[defaultLang];
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            element.textContent = currentTranslations[key] || key;
        });
        document.querySelectorAll('[data-i18n-placeholder-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder-key');
            element.placeholder = currentTranslations[key] || key;
        });
    };

    const setLanguage = (lang) => {
        applyTranslations(lang);
        languageSelector.value = lang;
        localStorage.setItem('language', lang);
    };

    const initI18n = () => {
        const savedLang = localStorage.getItem('language');
        const browserLang = navigator.language.split('-')[0];
        
        let langToLoad = defaultLang;
        if (savedLang && supportedLangs.includes(savedLang)) {
            langToLoad = savedLang;
        } else if (supportedLangs.includes(browserLang)) {
            langToLoad = browserLang;
        }
        
        setLanguage(langToLoad);
    };

    languageSelector.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    // --- Application Logic ---
    
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

    amountInput.addEventListener('blur', () => {
        const value = parseFloat(amountInput.value);
        if (amountInput.value && value < 10) {
            amountInput.value = 10;
        }
    });

    donationForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        donateButton.disabled = true;
        buttonText.textContent = currentTranslations['button_creating'];
        buttonLoader.classList.remove('hidden');

        const amount = document.getElementById('amount').value;
        const currency = document.querySelector('input[name="currency"]:checked').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        try {
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: parseFloat(amount), 
                    currency, 
                    email, 
                    message 
                })
            });

            const data = await response.json();

            if (response.ok && !data.error) {
                displayPaymentDetails(data);
            } else {
                showNotification(data.message || 'An error occurred.', 'error');
                resetButton();
            }
        } catch (error) {
            console.error('Error creating payment:', error);
            showNotification('Could not connect to the server.', 'error');
            resetButton();
        }
    });

    function displayPaymentDetails(data) {
        donationView.classList.add('hidden');
        paymentView.classList.remove('hidden');

        let currencySymbol = data.pay_currency.toUpperCase();
        if (currencySymbol === 'USDTTRC20') {
            currencySymbol = 'USDT';
        }
        
        const networkName = data.network.toUpperCase();

        paymentNetwork.textContent = networkName;
        paymentAmount.textContent = `${data.pay_amount} ${currencySymbol}`;
        paymentAddress.textContent = data.pay_address;

        qrcodeDiv.innerHTML = '';
        const qr = qrcode(0, 'M');
        qr.addData(data.pay_address);
        qr.make();
        qrcodeDiv.innerHTML = qr.createImgTag(6, 8);

        startPolling(data.payment_id);
    }

    async function copyToClipboard(text) {
        if (!navigator.clipboard) {
            showNotification('Copying is not supported in this browser.', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            showNotification(currentTranslations['address_copied']);

            copyIcon.setAttribute('data-lucide', 'check');
            if (window.lucide) {
                lucide.createIcons();
            }

            setTimeout(() => {
                copyIcon.setAttribute('data-lucide', 'copy');
                if (window.lucide) {
                    lucide.createIcons();
                }
            }, 2000);

        } catch (err) {
            console.error('Failed to copy:', err);
            showNotification(currentTranslations['copy_failed'], 'error');
        }
    }

    copyContainer.addEventListener('click', async () => {
        const address = paymentAddress.textContent;
        if (address) {
            await copyToClipboard(address);
        }
    });

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
                console.error('Error checking payment status:', error);
            }
        }, 10000);
    }

    function showSuccessMessage() {
        paymentView.classList.add('hidden');
        successView.classList.remove('hidden');
    }
    
    function resetButton() {
        donateButton.disabled = false;
        buttonText.textContent = currentTranslations['donate_button'];
        buttonLoader.classList.add('hidden');
    }

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

    // Initialize I18n
    initI18n();
});
