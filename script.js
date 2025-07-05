document.addEventListener('DOMContentLoaded', () => {
    // --- I18N (Internationalization) Setup ---
    const supportedLangs = ['en', 'tr'];
    const defaultLang = 'en';
    let translations = {};

    const languageSelector = document.getElementById('language-selector');

    const applyTranslations = () => {
        // Ensure translations are loaded
        if (Object.keys(translations).length === 0) return;

        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder-key');
            if (translations[key]) {
                element.placeholder = translations[key];
            }
        });
    };

    const loadLanguage = async (lang) => {
        try {
            // Use a relative path for fetch
            const response = await fetch(`./locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load ${lang}.json - Status: ${response.status}`);
            }
            translations = await response.json();
            document.documentElement.lang = lang;
            applyTranslations();
            // Re-create icons in case any were added dynamically
            if (window.lucide) {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Failed to load language file:', error);
            if (lang !== defaultLang) {
                loadLanguage(defaultLang); // Fallback to default language
            }
        }
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

        languageSelector.value = langToLoad;
        loadLanguage(langToLoad);
    };

    languageSelector.addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        localStorage.setItem('language', selectedLang);
        loadLanguage(selectedLang);
    });

    // --- Application Logic ---
    
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
        if (amountInput.value && value < 10) {
            amountInput.value = 10;
        }
    });

    // Bağış formu gönderildiğinde
    donationForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        donateButton.disabled = true;
        buttonText.textContent = translations['button_creating'] || 'Creating...';
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
            showNotification('Could not connect to the server. Please check your internet connection.', 'error');
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
            showNotification(translations['address_copied'] || 'Address copied to clipboard!');

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
            showNotification(translations['copy_failed'] || 'Failed to copy address.', 'error');
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
        // Ensure translations are available before using them
        buttonText.textContent = translations['donate_button'] || 'Donate';
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
