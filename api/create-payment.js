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
        const response = await axios.post('https://api.nowpayments.io/v1/payment', {
            price_amount: amount,
            price_currency: 'usd',
            pay_currency: currency,
            order_description: `Donation of ${amount} USD. From: ${email || 'Anonymous'}. Message: ${message || 'None'}`
        }, {
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.payment_url) {
            res.status(200).json({ payment_url: response.data.payment_url });
        } else {
            console.error('NOWPAYMENTS_RESPONSE_ERROR:', response.data);
            res.status(500).json({ message: 'Failed to get payment URL from NowPayments.' });
        }
    } catch (error) {
        console.error('AXIOS_ERROR:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to create payment due to an external error.' });
    }
};
