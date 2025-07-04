const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { amount, currency, email, message } = req.body;
    const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;

    if (!amount || !currency) {
        return res.status(400).json({ message: 'Amount and currency are required.' });
    }

    if (!NOWPAYMENTS_API_KEY) {
        return res.status(500).json({ message: 'API key is not configured.' });
    }

    try {
        const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
            price_amount: amount,
            price_currency: 'usd',
            order_description: `Donation of ${amount} USD. From: ${email || 'Anonymous'}. Message: ${message || 'None'}`,
            // You can specify a success URL if you have a thank you page
            // success_url: 'https://yourdomain.com/thank-you', 
        }, {
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // The invoice endpoint returns an invoice_url
        if (response.data && response.data.invoice_url) {
            // We still return it as payment_url to match the frontend script
            res.status(200).json({ payment_url: response.data.invoice_url });
        } else {
            console.error('NOWPAYMENTS_INVOICE_ERROR:', response.data);
            res.status(500).json({ message: 'Failed to get invoice URL from NowPayments.' });
        }
    } catch (error) {
        console.error('AXIOS_INVOICE_ERROR:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to create invoice due to an external error.' });
    }
};
