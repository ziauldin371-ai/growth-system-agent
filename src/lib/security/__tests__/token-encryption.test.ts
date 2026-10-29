import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../token-encryption';

describe('Token Encryption (AES-256-GCM)', () => {
  it('encrypts and successfully decrypts a plaintext token', () => {
    const originalToken = 'mock_sample_google_oauth_refresh_token_string_12345';
    const encrypted = encryptToken(originalToken);

    expect(encrypted.cipherText).toBeDefined();
    expect(encrypted.iv).toHaveLength(32); // 16 bytes in hex
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes in hex
    expect(encrypted.cipherText).not.toEqual(originalToken);

    const decrypted = decryptToken(encrypted.cipherText, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(originalToken);
  });

  it('fails decryption when ciphertext is tampered', () => {
    const originalToken = 'secret-token-123';
    const encrypted = encryptToken(originalToken);

    // Tamper with ciphertext
    const tamperedCipher = encrypted.cipherText.slice(0, -2) + 'aa';

    expect(() => {
      decryptToken(tamperedCipher, encrypted.iv, encrypted.authTag);
    }).toThrow();
  });

  it('fails decryption when authTag is invalid', () => {
    const originalToken = 'secret-token-123';
    const encrypted = encryptToken(originalToken);

    const tamperedTag = '00000000000000000000000000000000';

    expect(() => {
      decryptToken(encrypted.cipherText, encrypted.iv, tamperedTag);
    }).toThrow();
  });
});

