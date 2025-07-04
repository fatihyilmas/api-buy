const axios = require('axios');

module.exports = async (req, res) => {
    const { payment_id } = req.query;
    const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;

    if (!payment_id) {
        return res.status(400).json({ message: 'Payment ID is required.' });
    }

    if (!NOWPAYMENTS_API_KEY) {
        return res.status(500).json({ message: 'API key is not configured.' });
    }

    try {
        const response = await axios.get(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY
            }
        });

        res.status(200).json({ payment_status: response.data.payment_status });
    } catch (error) {
        console.error('AXIOS_CHECK_PAYMENT_ERROR:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to check payment status.' });
    }
};
