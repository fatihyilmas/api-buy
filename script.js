document.addEventListener('DOMContentLoaded', () => {
    // --- I18N (Internationalization) Setup ---
    const supportedLangs = ['en', 'tr', 'ja', 'ar', 'ru', 'de', 'es', 'fr', 'pt'];
    const defaultLang = 'en';
    let currentTranslations = {};

    // Embed translations directly into the script
    const translations = {
        en: {
            "support_project": "Support the Project",
            "support_valuable": "Your support is very valuable for the development and sustainability of our project.",
            "have_idea": "Have an Idea?",
            "idea_description": "Want a new feature or have a suggestion? Let us know by adding your note in the 'Message' section. We prioritize developments based on these requests!",
            "amount_placeholder_new": "Donation Amount",
            "min_amount_default": "Min: 10 USD",
            "min_amount_loading": "Calculating...",
            "min_amount_error": "Error",
            "min_amount_format": "Min: {amount}",
            "amount_placeholder_crypto": "Min: {amount} {currency}",
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
            "donation_successful": "Your donation of {amount} {currency} has been successfully received. Your support is very valuable to us.",
            "address_copied": "Address copied to clipboard!",
            "copy_failed": "Failed to copy address.",
            "payment_failed": "Payment failed. Please try again.",
            "payment_expired": "Payment expired. Please create a new one."
        },
        tr: {
            "support_project": "Projeyi Destekle",
            "support_valuable": "Desteğiniz, projemizin geliştirilmesi ve sürdürülebilirliği için çok değerlidir.",
            "have_idea": "Bir Fikrin mi Var?",
            "idea_description": "Yeni bir özellik mi istiyorsunuz veya bir öneriniz mi var? 'Mesaj' bölümüne notunuzu ekleyerek bize bildirin. Geliştirmeleri bu isteklere göre önceliklendiriyoruz!",
            "amount_placeholder_new": "Bağış Miktarı",
            "min_amount_default": "Min: 10 USD",
            "min_amount_loading": "Hesaplanıyor...",
            "min_amount_error": "Hata",
            "min_amount_format": "Min: {amount}",
            "amount_placeholder_crypto": "Min: {amount} {currency}",
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
            "donation_successful": "{amount} {currency} tutarındaki bağışınız başarıyla alındı. Desteğiniz bizim için çok değerli.",
            "address_copied": "Adres panoya kopyalandı!",
            "copy_failed": "Adres kopyalanamadı.",
            "payment_failed": "Ödeme başarısız oldu. Lütfen tekrar deneyin.",
            "payment_expired": "Ödeme süresi doldu. Lütfen yeni bir ödeme oluşturun."
        },
        // Add other languages here if needed, following the same structure
    };

    const languageSelector = document.getElementById('language-selector');

    const applyTranslations = (lang) => {
        currentTranslations = translations[lang] || translations[defaultLang];
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            if (currentTranslations[key]) {
                 element.textContent = currentTranslations[key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder-key');
             if (currentTranslations[key]) {
                element.placeholder = currentTranslations[key];
            }
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
    const donateButtonLabel = document.getElementById('donate-button-label');
    const actualDonateButton = document.getElementById('donate-button');
    const buttonText = document.getElementById('button-text-display');
    const buttonLoader = document.getElementById('button-loader-display');
    const donationView = document.getElementById('donation-view');
    const paymentView = document.getElementById('payment-view');
    const successView = document.getElementById('success-view');
    const successMessage = document.getElementById('success-message');
    const paymentNetwork = document.getElementById('payment-network');
    const paymentAmount = document.getElementById('payment-amount');
    const paymentAddress = document.getElementById('payment-address');
    const qrcodeDiv = document.getElementById('qrcode');
    const copyContainer = document.getElementById('copy-container');
    const copyIcon = document.getElementById('copy-icon');
    const backToHomeButton = document.getElementById('back-to-home');
    const minAmountText = document.getElementById('min-amount-text');
    const amountIcon = document.getElementById('amount-icon');

    let pollingInterval;
    let currentMinAmount = 10;
    let isCrypto = false;

    amountInput.addEventListener('blur', () => {
        const value = parseFloat(amountInput.value);
        if (amountInput.value && value < currentMinAmount) {
            amountInput.value = currentMinAmount;
        }
    });

    donationForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        actualDonateButton.disabled = true;
        donateButtonLabel.classList.add('disabled');
        buttonText.textContent = currentTranslations['button_creating'];
        buttonLoader.classList.remove('hidden');

        const amount = document.getElementById('amount').value;
        const currency = document.querySelector('input[name="currency"]:checked').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        const payload = {
            pay_currency: currency,
            order_description: `Donation from ${email || 'Anonymous'}. Message: ${message || 'None'}`
        };

        if (isCrypto) {
            payload.pay_amount = parseFloat(amount);
        } else {
            payload.price_amount = parseFloat(amount);
        }

        try {
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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

                if (response.ok && !data.error) {
                    if (data.actually_paid > 0 && ['finished', 'confirmed', 'sending', 'partially_paid'].includes(data.payment_status)) {
                        clearInterval(pollingInterval);
                        showSuccessMessage(data);
                    }
                    else if (['failed', 'expired'].includes(data.payment_status)) {
                        clearInterval(pollingInterval);
                        const messageKey = data.payment_status === 'failed' ? 'payment_failed' : 'payment_expired';
                        showNotification(currentTranslations[messageKey], 'error');
                        setTimeout(() => {
                            location.reload();
                        }, 3000);
                    }
                } else {
                     showNotification(data.message || 'Error checking payment status.', 'error');
                }
            } catch (error) {
                console.error('Error checking payment status:', error);
            }
        }, 10000);
    }

    function showSuccessMessage(data) {
        paymentView.classList.add('hidden');
        successView.classList.remove('hidden');

        const amount = data.actually_paid;
        const currency = data.price_currency.toUpperCase();
        
        let message = currentTranslations['donation_successful'] || "Your donation of {amount} {currency} has been successfully received. Your support is very valuable to us.";
        
        successMessage.textContent = message.replace('{amount}', amount).replace('{currency}', currency);

        setTimeout(() => {
            location.reload();
        }, 10000);
    }

    function resetButton() {
        actualDonateButton.disabled = false;
        donateButtonLabel.classList.remove('disabled');
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

    const currencyOptions = document.querySelectorAll('.currency-option');

    async function updateMinAmount() {
        const selectedCurrency = document.querySelector('input[name="currency"]:checked').value;
        const currencySymbol = document.querySelector('input[name="currency"]:checked').parentElement.querySelector('span').textContent;

        minAmountText.textContent = currentTranslations['min_amount_loading'];
        amountInput.disabled = true;
        amountInput.value = '';

        if (selectedCurrency === 'usdttrc20') {
            currentMinAmount = 10;
            isCrypto = false;
            minAmountText.textContent = currentTranslations['min_amount_default'];
            amountInput.placeholder = currentTranslations['amount_placeholder_new'];
            amountIcon.setAttribute('data-lucide', 'dollar-sign');
            lucide.createIcons();
            amountInput.disabled = false;
            return;
        }

        isCrypto = true;
        amountIcon.setAttribute('data-lucide', 'coins');
        lucide.createIcons();

        try {
            const response = await fetch(`/api/get-estimated-price?currency=${selectedCurrency}`);
            const data = await response.json();

            if (response.ok && data.estimated_amount) {
                let estimatedAmount = parseFloat(data.estimated_amount);
                
                if (estimatedAmount < 1) {
                    currentMinAmount = Math.ceil(estimatedAmount * 100000000) / 100000000;
                } else {
                    currentMinAmount = Math.ceil(estimatedAmount);
                }

                minAmountText.textContent = currentTranslations['min_amount_format']
                    .replace('{amount}', currentMinAmount);
                
                amountInput.placeholder = currentTranslations['amount_placeholder_crypto']
                    .replace('{amount}', currentMinAmount)
                    .replace('{currency}', currencySymbol);

            } else {
                minAmountText.textContent = currentTranslations['min_amount_error'];
            }
        } catch (error) {
            console.error('Error fetching min amount:', error);
            minAmountText.textContent = currentTranslations['min_amount_error'];
        } finally {
            amountInput.disabled = false;
        }
    }

    function handleCurrencySelection() {
        currencyOptions.forEach(opt => {
            opt.classList.remove('selected');
            const indicator = opt.querySelector('.selection-indicator');
            if (indicator) {
                indicator.innerHTML = '';
            }
        });

        const checkedRadio = document.querySelector('input[name="currency"]:checked');
        if (checkedRadio) {
            const selectedLabel = checkedRadio.closest('.currency-option');
            if (selectedLabel) {
                selectedLabel.classList.add('selected');
                const indicator = selectedLabel.querySelector('.selection-indicator');
                if (indicator) {
                    indicator.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5 text-blue-500"></i>';
                }
            }
        }
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    currencyOptions.forEach(option => {
        option.addEventListener('click', () => {
            setTimeout(() => {
                handleCurrencySelection();
                updateMinAmount();
            }, 0);
        });
    });

    handleCurrencySelection();
    updateMinAmount();

    donateButtonLabel.addEventListener('click', () => {
        if (!actualDonateButton.disabled) {
            actualDonateButton.click();
        }
    });

    initI18n();

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
});
