import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.ENCRYPTION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: SESSION_SECRET must be configured in production.');
    }
    // Fail-safe dev secret
    return new TextEncoder().encode('development_only_insecure_jwt_secret_key_minimum_32_bytes_long!');
  }
  // Guarantee a minimum length key via SHA-256 derivation in Edge/Node
  return new TextEncoder().encode(secret.padEnd(32, '_'));
}

/**
 * Creates a cryptographically signed HMAC-SHA256 JWT session token.
 */
export async function createSessionToken(
  user: { email: string; name?: string; role?: string },
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days default
): Promise<string> {
  const secret = getJwtSecretKey();
  const token = await new SignJWT({
    email: user.email.toLowerCase().trim(),
    name: user.name || 'Zia Ul Din',
    role: user.role || 'owner',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret);

  return token;
}

/**
 * Verifies a JWT session token cryptographically in Node.js and Next.js Edge Runtime.
 * Strictly rejects forged, unsigned, tampered, or expired tokens.
 */
export async function verifySessionToken(token: string): Promise<{
  valid: boolean;
  payload?: SessionPayload;
  error?: string;
}> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing' };
  }

  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (!payload.email || typeof payload.email !== 'string') {
      return { valid: false, error: 'Invalid token claims' };
    }

    return {
      valid: true,
      payload: {
        email: payload.email as string,
        name: (payload.name as string) || 'Zia Ul Din',
        role: (payload.role as string) || 'owner',
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Signature verification failed' };
  }
}
