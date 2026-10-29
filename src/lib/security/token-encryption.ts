import crypto from 'crypto';

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
  authTag: string;
}

/**
 * Derives a 32-byte key for AES-256 from application secrets.
 */
function getEncryptionKey(): Buffer {
  const secret = 
    process.env.ENCRYPTION_SECRET || 
    process.env.ADMIN_PASSWORD || 
    'default_growth_system_secure_secret_fallback_key';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive credentials (like Google OAuth tokens) using AES-256-GCM.
 */
export function encryptToken(plainText: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    cipherText: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts AES-256-GCM encrypted tokens and verifies tag authenticity.
 */
export function decryptToken(cipherText: string, ivHex: string, authTagHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
