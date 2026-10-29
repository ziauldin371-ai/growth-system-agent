import crypto from 'crypto';

function getSigningSecret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'growth_system_unsubscribe_hmac_secret_2026'
  );
}

/**
 * Generates a tamper-proof HMAC signed unsubscribe token for an email address.
 */
export function generateUnsubscribeToken(email: string, expiresInDays: number = 90): string {
  const secret = getSigningSecret();
  const payload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('hex');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a signed unsubscribe token and extracts the authenticated email address.
 */
export function verifyUnsubscribeToken(token: string): {
  valid: boolean;
  email?: string;
  error?: string;
} {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Malformed unsubscribe token' };
  }

  const [payloadB64, signature] = token.split('.');
  const secret = getSigningSecret();

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('hex');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid token signature (token has been tampered with)' };
  }

  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(raw);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Unsubscribe token has expired' };
    }

    if (!payload.email || typeof payload.email !== 'string' || !payload.email.includes('@')) {
      return { valid: false, error: 'Invalid email in token payload' };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}

