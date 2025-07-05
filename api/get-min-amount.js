const apiClient = require('./_lib/nowpayments');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: true, message: 'Yalnızca GET istekleri kabul edilir.' });
    }

    const { currency_from } = req.query;

    if (!currency_from) {
        return res.status(400).json({ error: true, message: 'Para birimi (currency_from) gereklidir.' });
    }

    try {
        const response = await apiClient.get(`min-amount?currency_from=${currency_from}&currency_to=usd`);
        const { min_amount } = response.data;

        if (min_amount !== undefined) {
            res.status(200).json({ min_amount });
        } else {
            console.error('NOWPAYMENTS_GET_MIN_AMOUNT_UNEXPECTED_RESPONSE:', response.data);
            res.status(500).json({ error: true, message: 'Minimum tutar alınamadı.' });
        }
    } catch (error) {
        console.error('NOWPAYMENTS_GET_MIN_AMOUNT_ERROR:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: true, message: 'Minimum tutar kontrol edilemedi.' });
    }
};
