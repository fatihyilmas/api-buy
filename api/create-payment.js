const crypto = require('crypto');

function deriveKey(secret, salt, iterations, keylen, digest) {
    return crypto.pbkdf2Sync(secret, salt, iterations, keylen, digest);
}

function decrypt(encryptedText, secret) {
    if (!encryptedText || !secret) {
        return "";
    }
    try {
        const data = Buffer.from(encryptedText, 'base64');
        const iv = data.slice(0, 12);
        const tag = data.slice(12, 28);
        const ciphertext = data.slice(28);

        const SALT = Buffer.from('jbot_salt_v1');
        const ITERATIONS = 100000;
        const KEY_LENGTH = 32;

        const key = deriveKey(secret, SALT, ITERATIONS, KEY_LENGTH, 'sha256');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext, 'buffer', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Decryption failed:", e.message);
        return "";
    }
}

const ENCRYPTED_LOGIC = process.env.ENCRYPTED_LOGIC;
const DECRYPTION_KEY = process.env.DECRYPTION_KEY;

let decryptedLogic = null;

if (ENCRYPTED_LOGIC && DECRYPTION_KEY) {
    decryptedLogic = decrypt(ENCRYPTED_LOGIC, DECRYPTION_KEY);
    if (!decryptedLogic) {
        console.error("ERROR: Decrypted logic is empty. Check ENCRYPTED_LOGIC and DECRYPTION_KEY.");
    }
} else {
    console.error("ERROR: ENCRYPTED_LOGIC or DECRYPTION_KEY environment variables are missing.");
}

const executeBusinessLogic = decryptedLogic ? new Function('req', 'res', 'env', decryptedLogic) : null;

module.exports = async (req, res) => {
    if (!executeBusinessLogic) {
        return res.status(500).json({ error: true, message: 'Sunucu yapılandırma hatası: İş mantığı yüklenemedi.' });
    }

    const env = {
        NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY
    };

    try {
        await executeBusinessLogic(req, res, env);
    } catch (error) {
        console.error('BUSINESS_LOGIC_EXECUTION_ERROR:', error);
        return res.status(500).json({ error: true, message: 'Dahili sunucu hatası.' });
    }
};
