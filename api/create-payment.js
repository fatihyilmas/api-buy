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
        // We revert to the /payment endpoint to get a deposit address
        const response = await axios.post('https://api.nowpayments.io/v1/payment', {
            price_amount: amount,
            price_currency: 'usd',
            pay_currency: currency, // Use the currency selected by the user
            order_description: `Donation of ${amount} USD. From: ${email || 'Anonymous'}. Message: ${message || 'None'}`
        }, {
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const { payment_id, pay_address, pay_amount, pay_currency, network } = response.data;

        if (payment_id && pay_address && pay_amount && pay_currency && network) {
            res.status(200).json({
                payment_id,
                pay_address,
                pay_amount,
                pay_currency,
                network,
                email: email, // Pass back the email if provided
                message: message // Pass back the message if provided
            });
        } else {
            console.error('NOWPAYMENTS_PAYMENT_ERROR:', response.data);
            res.status(500).json({ message: 'Failed to get payment details from NowPayments.' });
        }
    } catch (error) {
        console.error('AXIOS_PAYMENT_ERROR:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to create payment due to an external error.' });
    }
};
