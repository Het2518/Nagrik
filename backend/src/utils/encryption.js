'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
  const key = process.env.AADHAAR_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('AADHAAR_ENCRYPTION_KEY must be at least 32 characters');
  }
  return Buffer.from(key.slice(0, 32));
};

// AES-256-CBC with a random IV — secure but NOT deterministic (same input → different output)
const encrypt = (plainText) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (cipherText) => {
  const [ivHex, encryptedHex] = cipherText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBytes = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  return Buffer.concat([decipher.update(encryptedBytes), decipher.final()]).toString();
};

const maskAadhaar = (cipherText) => {
  try {
    const plain = decrypt(cipherText);
    return `XXXX-XXXX-${plain.slice(-4)}`;
  } catch {
    return 'XXXX-XXXX-XXXX';
  }
};

// HMAC-SHA256 of the Aadhaar — deterministic and one-way.
// Used as the uniqueness key in the DB index so the same Aadhaar cannot
// register twice, even though the encrypted value changes every time (random IV).
const hashAadhaar = (plainAadhaar) => {
  const pepper = process.env.AADHAAR_ENCRYPTION_KEY || '';
  return crypto.createHmac('sha256', pepper).update(plainAadhaar.trim()).digest('hex');
};

module.exports = { encrypt, decrypt, maskAadhaar, hashAadhaar };
