import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { loginGuard } from '@/lib/security/login-guard';
import { verifySessionToken } from '@/lib/security/session';

describe('/api/auth/login endpoint security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ADMIN_EMAIL = 'ziauldin371@gmail.com';
    process.env.ADMIN_PASSWORD = 'TestAdminPassword123!';
    process.env.SESSION_SECRET = 'a_very_secret_key_that_is_at_least_32_chars_long!';
    loginGuard.resetAttempts('127.0.0.1', 'ziauldin371@gmail.com');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects missing email or password with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Valid email and password are required');
  });

  it('rejects unauthorized admin email with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@evil.com', password: 'TestAdminPassword123!' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access restricted');
  });

  it('rejects wrong password with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: 'WrongPassword' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('locks account after 5 failed attempts with 429', async () => {
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: 'WrongPassword' }),
      });
      await POST(req);
    }

    const lockedReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: 'TestAdminPassword123!' }),
    });
    const res = await POST(lockedReq);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many failed login attempts');
  });

  it('authenticates valid credentials, sets signed JWT cookie, and returns 200', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: 'TestAdminPassword123!' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const cookieHeader = res.cookies.get('growth_agent_session');
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader?.value).toBeDefined();

    const verified = await verifySessionToken(cookieHeader!.value);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.email).toBe('ziauldin371@gmail.com');
  });
});
