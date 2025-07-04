document.getElementById('donation-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const amount = document.getElementById('amount').value;
    const currency = document.getElementById('currency').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    const responseDiv = document.getElementById('response');
    const donateButton = document.getElementById('donate-button');

    donateButton.disabled = true;
    responseDiv.textContent = 'Processing...';

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
            window.location.href = data.payment_url;
        } else {
            responseDiv.textContent = `Error: ${data.message}`;
        }
    } catch (error) {
        responseDiv.textContent = 'An unexpected error occurred.';
        console.error(error);
    } finally {
        donateButton.disabled = false;
    }
});
