import * as crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

/**
 * Encrypt IP address using AES-256-GCM
 * @param text - IP address to encrypt
 * @returns Encrypted string in format: salt:iv:tag:encrypted
 */
export function encryptIpAddress(text: string): string {
  if (!text) return '';

  const secret = process.env.JWT_SECRET || 'default-secret-key';
  
  // Generate salt
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive key from secret using PBKDF2
  const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  
  // Generate IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get auth tag
  const tag = cipher.getAuthTag();
  
  // Return combined string: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt IP address using AES-256-GCM
 * @param encryptedText - Encrypted string in format: salt:iv:tag:encrypted
 * @returns Decrypted IP address
 */
export function decryptIpAddress(encryptedText: string): string {
  if (!encryptedText) return '';

  const secret = process.env.JWT_SECRET || 'default-secret-key';
  
  // Split encrypted text
  const parts = encryptedText.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format');
  }
  
  const [saltHex, ivHex, tagHex, encrypted] = parts;
  
  // Convert hex to buffers
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  // Derive key from secret
  const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Format timestamp to ISO 8601 string
 * @param date - Date object or timestamp
 * @returns ISO 8601 string
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Calculate expiry timestamp
 * @param seconds - Seconds from now
 * @returns ISO 8601 string of expiry time
 */
export function calculateExpiry(seconds: number): string {
  const expiry = new Date(Date.now() + seconds * 1000);
  return expiry.toISOString();
}
