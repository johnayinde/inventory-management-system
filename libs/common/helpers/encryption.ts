import * as crypto from 'crypto';
import { encryptData } from '@app/common';

// Function to generate a random 32-byte key for AES-256
function generateKey() {
  return crypto.randomBytes(32);
}

// Function to encrypt using AES-256-CTR
export function encryption(data): encryptData {
  const key = generateKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  const jsonData = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(jsonData, 'utf-8'),
    cipher.final(),
  ]);
  return {
    iv: iv.toString('hex'),
    salt: key.toString('hex'),
    encryptedText: encrypted.toString('hex'),
  };
}

// Function to decrypt using AES-256-CTR
export function decryption(data: encryptData) {
  const { encryptedText, iv, salt } = data;
  const key = Buffer.from(salt, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-ctr',
    key,
    Buffer.from(iv, 'hex'),
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf-8'));
}
