import CryptoJS from 'crypto-js';

// In a real production app, this key should be in an environment variable (e.g. VITE_ENCRYPTION_KEY)
// and never committed to source control. For this demo/prototype, we use a constant.
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'vista-auction-secure-salt-v1';

/**
 * Encrypts a sensitive string value using AES.
 * @param {string} value - The value to encrypt
 * @returns {string} - The encrypted string (ciphertext)
 */
export const encryptData = (value) => {
    if (!value) return '';
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

/**
 * Decrypts an AES encrypted string.
 * @param {string} ciphertext - The encrypted string
 * @returns {string} - The original decrypted value
 */
export const decryptData = (ciphertext) => {
    if (!ciphertext) return '';
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("Decryption failed", e);
        return '***';
    }
};
