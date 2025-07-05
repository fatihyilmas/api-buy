const apiClient = require('./_lib/nowpayments');

module.exports = async (req, res) => {
    const { payment_id } = req.query;

    if (!payment_id) {
        return res.status(400).json({ error: true, message: 'Ödeme kimliği (payment_id) gereklidir.' });
    }

    try {
        const response = await apiClient.get(`payment/${payment_id}`);
        
        const { payment_status, pay_amount, pay_currency } = response.data;

        if (payment_status) {
            res.status(200).json({ payment_status, pay_amount, pay_currency });
        } else {
            console.error('NOWPAYMENTS_CHECK_UNEXPECTED_RESPONSE:', response.data);
            res.status(500).json({ error: true, message: 'Ödeme durumu alınamadı.' });
        }
    } catch (error) {
        console.error('NOWPAYMENTS_CHECK_ERROR:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: true, message: 'Ödeme durumu kontrol edilemedi.' });
    }
};
