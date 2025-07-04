document.getElementById('donation-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const amount = document.getElementById('amount').value;
    const currency = document.getElementById('currency').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    const responseDiv = document.getElementById('response');
    const donateButton = document.getElementById('donate-button');

    donateButton.disabled = true;
    responseDiv.textContent = 'Ödeme oluşturuluyor...';

    try {
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, currency, email, message })
        });

        const data = await response.json();

        if (response.ok) {
            displayPaymentDetails(data);
        } else {
            responseDiv.textContent = `Hata: ${data.message}`;
            donateButton.disabled = false;
        }
    } catch (error) {
        responseDiv.textContent = 'Beklenmedik bir hata oluştu.';
        console.error(error);
        donateButton.disabled = false;
    }
});

function displayPaymentDetails(data) {
    document.getElementById('donation-form').classList.add('hidden');
    document.getElementById('response').classList.add('hidden');

    const paymentDetailsDiv = document.getElementById('payment-details');
    const paymentAmountSpan = document.getElementById('payment-amount');
    const paymentAddressSpan = document.getElementById('payment-address');
    const paymentNetworkSpan = document.getElementById('payment-network');
    const qrcodeDiv = document.getElementById('qrcode');

    paymentNetworkSpan.textContent = data.network.toUpperCase();
    paymentAmountSpan.textContent = `${data.pay_amount} ${data.pay_currency.toUpperCase()}`;
    paymentAddressSpan.textContent = data.pay_address;

    // Generate QR Code
    qrcodeDiv.innerHTML = ''; // Clear previous QR code
    const qr = qrcode(0, 'M');
    qr.addData(data.pay_address);
    qr.make();
    qrcodeDiv.innerHTML = qr.createImgTag(4);

    paymentDetailsDiv.classList.remove('hidden');

    // Display donation details if available
    if (data.email || data.message) {
        const donationDetailsDiv = document.getElementById('donation-details');
        const emailP = document.getElementById('donation-email');
        const messageP = document.getElementById('donation-message');

        if (data.email) {
            emailP.innerHTML = `<strong>E-posta:</strong> ${data.email}`;
        }
        if (data.message) {
            messageP.innerHTML = `<strong>Mesaj:</strong> ${data.message}`;
        }
        donationDetailsDiv.classList.remove('hidden');
    }

    // Start polling for payment status
    startPolling(data.payment_id);
}

document.getElementById('copy-address').addEventListener('click', () => {
    const address = document.getElementById('payment-address').textContent;
    navigator.clipboard.writeText(address).then(() => {
        alert('Adres panoya kopyalandı!');
    }, (err) => {
        alert('Adres kopyalanamadı.');
        console.error('Metin kopyalanamadı: ', err);
    });
});

let pollingInterval;

function startPolling(paymentId) {
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/check-payment?payment_id=${paymentId}`);
            const data = await response.json();

            if (data.payment_status === 'finished' || data.payment_status === 'confirmed' || data.payment_status === 'sending') {
                clearInterval(pollingInterval);
                showSuccessMessage();
            }
        } catch (error) {
            console.error('Error polling payment status:', error);
        }
    }, 10000); // Poll every 10 seconds
}

function showSuccessMessage() {
    document.getElementById('payment-details').classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');
}
