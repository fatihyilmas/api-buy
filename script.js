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
    const qrcodeDiv = document.getElementById('qrcode');

    paymentAmountSpan.textContent = `${data.pay_amount} ${data.pay_currency.toUpperCase()}`;
    paymentAddressSpan.textContent = data.pay_address;

    // Generate QR Code
    qrcodeDiv.innerHTML = ''; // Clear previous QR code
    const qr = qrcode(0, 'M');
    qr.addData(data.pay_address);
    qr.make();
    qrcodeDiv.innerHTML = qr.createImgTag(4);

    paymentDetailsDiv.classList.remove('hidden');
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
