const crypto = require('crypto');

// Retrieve master key from environment variables
const getMasterKey = () => {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET is not defined in environment variables.');
  }
  
  // If it's a hex string representing 32 bytes (64 chars), convert to buffer
  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  
  // Otherwise, hash it to ensure a consistent 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
};

const ALGORITHM = 'aes-256-cbc';

// Generate a random Initialization Vector (IV)
const generateIv = () => {
  return crypto.randomBytes(16);
};

// Encrypt a buffer
const encrypt = (buffer, iv) => {
  const key = getMasterKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return encrypted;
};

// Decrypt a buffer
const decrypt = (buffer, iv) => {
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
  return decrypted;
};

// Create an encryption stream
const encryptStream = (iv) => {
  const key = getMasterKey();
  return crypto.createCipheriv(ALGORITHM, key, iv);
};

// Create a decryption stream
const decryptStream = (iv) => {
  const key = getMasterKey();
  return crypto.createDecipheriv(ALGORITHM, key, iv);
};

module.exports = {
  generateIv,
  encrypt,
  decrypt,
  encryptStream,
  decryptStream,
};
