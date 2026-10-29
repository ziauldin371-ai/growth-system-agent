import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSessionToken, verifySessionToken } from '../session';

describe('Cryptographic Session Verification (0.1 Security Fix)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.SESSION_SECRET = 'super_secure_random_key_for_testing_session_signing_32_bytes!';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('signs and verifies a valid operator session token', async () => {
    const token = await createSessionToken({
      email: 'ziauldin371@gmail.com',
      name: 'Zia Ul Din',
      role: 'owner',
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const result = await verifySessionToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.email).toBe('ziauldin371@gmail.com');
    expect(result.payload?.role).toBe('owner');
  });

  it('strictly rejects forged or arbitrary tokens like "growth_agent_session=x"', async () => {
    const forgedTokens = [
      'x',
      'operator_session_1793312345_emlh',
      'admin',
      'true',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.unverified_signature',
    ];

    for (const forged of forgedTokens) {
      const result = await verifySessionToken(forged);
      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
    }
  });

  it('strictly rejects tampered session tokens', async () => {
    const token = await createSessionToken({
      email: 'ziauldin371@gmail.com',
    });

    const parts = token.split('.');
    // Tamper with payload
    const tampered = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;

    const result = await verifySessionToken(tampered);
    expect(result.valid).toBe(false);
  });

  it('strictly rejects expired session tokens', async () => {
    // 0 second validity
    const token = await createSessionToken(
      { email: 'ziauldin371@gmail.com' },
      -10 // expired 10 seconds ago
    );

    const result = await verifySessionToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('claim timestamp check failed');
  });
});
