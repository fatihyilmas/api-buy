const apiClient = require('./_lib/nowpayments');

// Desteklenen para birimlerinin listesi
const SUPPORTED_CURRENCIES = ['trx', 'usdttrc20', 'btc', 'ltc'];

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: true, message: 'Yalnızca POST istekleri kabul edilir.' });
    }

    const { amount, currency, email, message } = req.body;

    // Gelişmiş Doğrulama
    if (!amount || !currency) {
        return res.status(400).json({ error: true, message: 'Miktar ve para birimi alanları zorunludur.' });
    }
    if (typeof amount !== 'number' || amount < 10) {
        return res.status(400).json({ error: true, message: 'Geçersiz miktar. Minimum 10 USD olmalıdır.' });
    }
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
        return res.status(400).json({ error: true, message: 'Seçilen para birimi desteklenmiyor.' });
    }
     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: true, message: 'Lütfen geçerli bir e-posta adresi girin.' });
    }

    try {
        // 1. Adım: NowPayments'ten minimum ödeme miktarını kontrol et
        const minAmountResponse = await apiClient.get(`min-amount?currency_from=${currency}&currency_to=usd`);
        const minAmount = minAmountResponse.data.min_amount;

        if (amount < minAmount) {
            return res.status(400).json({ 
                error: true, 
                message: `Bu para birimi için minimum bağış tutarı ${minAmount} USD değerindedir.` 
            });
        }

        // 2. Adım: Ödemeyi oluştur
        const response = await apiClient.post('payment', {
            price_amount: amount,
            price_currency: 'usd',
            pay_currency: currency,
            order_description: `Bağış: ${amount} USD. Gönderen: ${email || 'Anonim'}. Mesaj: ${message || 'Yok'}`
        });

        const paymentDetails = response.data;

        // Gelen verinin beklenen yapıda olduğunu kontrol et
        if (paymentDetails && paymentDetails.payment_id) {
            res.status(200).json(paymentDetails);
        } else {
            console.error('NOWPAYMENTS_API_UNEXPECTED_RESPONSE:', paymentDetails);
            res.status(500).json({ error: true, message: 'Ödeme oluşturulamadı. Lütfen daha sonra tekrar deneyin.' });
        }
    } catch (error) {
        console.error('NOWPAYMENTS_CREATE_ERROR:', error.response ? error.response.data : error.message);
        // Kullanıcıya daha genel bir hata mesajı göster
        res.status(500).json({ error: true, message: 'Ödeme hizmetiyle iletişim kurulamadı. Lütfen daha sonra tekrar deneyin.' });
    }
};
