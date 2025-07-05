const axios = require('axios');

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;

if (!NOWPAYMENTS_API_KEY) {
    // Uygulama başlangıcında bu hatayı loglamak, anahtarın eksik olduğunu hemen fark etmeyi sağlar.
    console.error("FATAL_ERROR: NOWPAYMENTS_API_KEY is not configured.");
    // API anahtarı olmadan uygulama çalışamaz, bu yüzden bir istisna fırlatmak mantıklıdır.
    // Ancak sunucusuz bir ortamda, bu genellikle fonksiyonun çökmesine neden olur.
    // Bu nedenle, her istekte kontrol etmek yerine, burada merkezi bir kontrol sağlıyoruz.
}

const apiClient = axios.create({
    baseURL: 'https://api.nowpayments.io/v1/',
    headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
    }
});

// API istemcisini dışa aktar
module.exports = apiClient;
