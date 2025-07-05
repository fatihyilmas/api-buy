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

    // ['ja', 'ar', 'ur', 'bn', 'id', 'si', 'pt', 'fr', 'es', 'ru', 'de'].forEach(lang => {
    //     translations[lang] = translations.en; // Default to English
    // });
    
    translations.ja = {
        "support_project": "プロジェクトを支援する",
        "support_valuable": "皆様のご支援は、私たちのプロジェクトの発展と持続可能性にとって非常に貴重です。",
        "have_idea": "アイデアがありますか？",
        "idea_description": "新機能のご要望やご提案はありますか？「メッセージ」セクションにメモを追加してお知らせください。これらのリクエストに基づいて開発の優先順位を決定します！",
        "amount_placeholder": "寄付額 (最低10 USD)",
        "email_placeholder": "メールアドレス (任意)",
        "message_placeholder": "メッセージ (任意)",
        "donate_button": "寄付する",
        "button_creating": "作成中...",
        "complete_payment": "支払いを完了する",
        "network": "ネットワーク",
        "amount": "金額",
        "wallet_address": "ウォレットアドレス",
        "waiting_for_payment": "支払いの確認を待っています...",
        "thank_you": "ありがとうございます！",
        "donation_successful": "ご寄付は正常に受け付けられました。皆様のご支援に心より感謝申し上げます。",
        "address_copied": "アドレスがクリップボードにコピーされました！",
        "copy_failed": "アドレスのコピーに失敗しました。"
    };
    translations.ar = {
        "support_project": "ادعم المشروع",
        "support_valuable": "دعمكم قيم جدا لتطوير واستدامة مشروعنا.",
        "have_idea": "هل لديك فكرة؟",
        "idea_description": "هل تريد ميزة جديدة أو لديك اقتراح؟ أخبرنا عن طريق إضافة ملاحظتك في قسم 'الرسالة'. نحن نعطي الأولوية للتطورات بناءً على هذه الطلبات!",
        "amount_placeholder": "مبلغ التبرع (الحد الأدنى 10 دولار أمريكي)",
        "email_placeholder": "البريد الإلكتروني (اختياري)",
        "message_placeholder": "رسالتك (اختياري)",
        "donate_button": "تبرع الآن",
        "button_creating": "جارٍ الإنشاء...",
        "complete_payment": "أكمل الدفع",
        "network": "الشبكة",
        "amount": "المبلغ",
        "wallet_address": "عنوان المحفظة",
        "waiting_for_payment": "في انتظار تأكيد الدفع...",
        "thank_you": "شكرا لك!",
        "donation_successful": "تم استلام تبرعك بنجاح. دعمكم قيم جدا لنا.",
        "address_copied": "تم نسخ العنوان إلى الحافظة!",
        "copy_failed": "فشل نسخ العنوان."
    };
    translations.ru = {
        "support_project": "Поддержать проект",
        "support_valuable": "Ваша поддержка очень важна для развития и устойчивости нашего проекта.",
        "have_idea": "Есть идея?",
        "idea_description": "Хотите новую функцию или есть предложение? Сообщите нам, добавив заметку в разделе «Сообщение». Мы определяем приоритеты разработок на основе этих запросов!",
        "amount_placeholder": "Сумма пожертвования (мин. 10 USD)",
        "email_placeholder": "Электронная почта (необязательно)",
        "message_placeholder": "Ваше сообщение (необязательно)",
        "donate_button": "Пожертвовать",
        "button_creating": "Создание...",
        "complete_payment": "Завершить платеж",
        "network": "Сеть",
        "amount": "Сумма",
        "wallet_address": "Адрес кошелька",
        "waiting_for_payment": "Ожидание подтверждения платежа...",
        "thank_you": "Спасибо!",
        "donation_successful": "Ваше пожертвование успешно получено. Ваша поддержка очень ценна для нас.",
        "address_copied": "Адрес скопирован в буфер обмена!",
        "copy_failed": "Не удалось скопировать адрес."
    };
    translations.de = {
        "support_project": "Projekt unterstützen",
        "support_valuable": "Ihre Unterstützung ist für die Entwicklung und Nachhaltigkeit unseres Projekts sehr wertvoll.",
        "have_idea": "Haben Sie eine Idee?",
        "idea_description": "Wünschen Sie sich eine neue Funktion oder haben Sie einen Vorschlag? Teilen Sie uns dies mit, indem Sie Ihre Anmerkung im Abschnitt 'Nachricht' hinzufügen. Wir priorisieren Entwicklungen basierend auf diesen Anfragen!",
        "amount_placeholder": "Spendenbetrag (mind. 10 USD)",
        "email_placeholder": "E-Mail (optional)",
        "message_placeholder": "Ihre Nachricht (optional)",
        "donate_button": "Spenden",
        "button_creating": "Wird erstellt...",
        "complete_payment": "Zahlung abschließen",
        "network": "Netzwerk",
        "amount": "Betrag",
        "wallet_address": "Wallet-Adresse",
        "waiting_for_payment": "Warten auf Zahlungsbestätigung...",
        "thank_you": "Vielen Dank!",
        "donation_successful": "Ihre Spende wurde erfolgreich empfangen. Ihre Unterstützung ist für uns sehr wertvoll.",
        "address_copied": "Adresse in die Zwischenablage kopiert!",
        "copy_failed": "Adresse konnte nicht kopiert werden."
    };
    translations.es = {
        "support_project": "Apoyar el Proyecto",
        "support_valuable": "Su apoyo es muy valioso para el desarrollo y la sostenibilidad de nuestro proyecto.",
        "have_idea": "¿Tienes una idea?",
        "idea_description": "¿Quieres una nueva función o tienes una sugerencia? Háznoslo saber añadiendo tu nota en la sección 'Mensaje'. ¡Priorizamos los desarrollos en función de estas solicitudes!",
        "amount_placeholder": "Monto de la donación (mín. 10 USD)",
        "email_placeholder": "Correo electrónico (opcional)",
        "message_placeholder": "Tu mensaje (opcional)",
        "donate_button": "Donar",
        "button_creating": "Creando...",
        "complete_payment": "Completar el pago",
        "network": "Red",
        "amount": "Monto",
        "wallet_address": "Dirección de la billetera",
        "waiting_for_payment": "Esperando la confirmación del pago...",
        "thank_you": "¡Gracias!",
        "donation_successful": "Su donación ha sido recibida con éxito. Su apoyo es muy valioso para nosotros.",
        "address_copied": "¡Dirección copiada al portapapeles!",
        "copy_failed": "Error al copiar la dirección."
    };
    translations.fr = {
        "support_project": "Soutenir le Projet",
        "support_valuable": "Votre soutien est très précieux pour le développement et la pérennité de notre projet.",
        "have_idea": "Avez-vous une idée ?",
        "idea_description": "Vous souhaitez une nouvelle fonctionnalité ou avez une suggestion ? Faites-le nous savoir en ajoutant votre note dans la section 'Message'. Nous priorisons les développements en fonction de ces demandes !",
        "amount_placeholder": "Montant du don (min. 10 USD)",
        "email_placeholder": "E-mail (facultatif)",
        "message_placeholder": "Votre message (facultatif)",
        "donate_button": "Faire un don",
        "button_creating": "Création en cours...",
        "complete_payment": "Finaliser le paiement",
        "network": "Réseau",
        "amount": "Montant",
        "wallet_address": "Adresse du portefeuille",
        "waiting_for_payment": "En attente de la confirmation du paiement...",
        "thank_you": "Merci !",
        "donation_successful": "Votre don a été reçu avec succès. Votre soutien nous est très précieux.",
        "address_copied": "Adresse copiée dans le presse-papiers !",
        "copy_failed": "Échec de la copie de l'adresse."
    };
    translations.pt = {
        "support_project": "Apoiar o Projeto",
        "support_valuable": "O seu apoio é muito valioso para o desenvolvimento e a sustentabilidade do nosso projeto.",
        "have_idea": "Tem uma ideia?",
        "idea_description": "Quer uma nova funcionalidade ou tem uma sugestão? Informe-nos adicionando a sua nota na secção 'Mensagem'. Priorizamos os desenvolvimentos com base nestes pedidos!",
        "amount_placeholder": "Valor da doação (mín. 10 USD)",
        "email_placeholder": "E-mail (opcional)",
        "message_placeholder": "Sua mensagem (opcional)",
        "donate_button": "Doar",
        "button_creating": "A criar...",
        "complete_payment": "Concluir o pagamento",
        "network": "Rede",
        "amount": "Valor",
        "wallet_address": "Endereço da carteira",
        "waiting_for_payment": "A aguardar a confirmação do pagamento...",
        "thank_you": "Obrigado!",
        "donation_successful": "A sua doação foi recebida com sucesso. O seu apoio é muito valioso para nós.",
        "address_copied": "Endereço copiado para a área de transferência!",
        "copy_failed": "Falha ao copiar o endereço."
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
    const testSuccessButton = document.getElementById('test-success-button');

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

        // 10 saniye sonra sayfayı yenileyerek ana forma dön
        setTimeout(() => {
            location.reload();
        }, 10000);
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

    // Test button functionality
    if (testSuccessButton) {
        testSuccessButton.addEventListener('click', () => {
            console.log('Test button clicked. Simulating successful payment.');
            // Stop polling if it's running
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
            // Show the success message
            showSuccessMessage();
        });
    }
});
