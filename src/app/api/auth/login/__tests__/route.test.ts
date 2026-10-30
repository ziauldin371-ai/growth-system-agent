import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { loginGuard } from '@/lib/security/login-guard';
import { verifySessionToken } from '@/lib/security/session';

describe('/api/auth/login endpoint security', () => {
  const originalEnv = process.env;
  let dynamicTestPassword = '';

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    dynamicTestPassword = `test_pw_${crypto.randomBytes(16).toString('hex')}!`;
    process.env.ADMIN_EMAIL = 'ziauldin371@gmail.com';
    process.env.ADMIN_PASSWORD = dynamicTestPassword;
    process.env.SESSION_SECRET = `secret_${crypto.randomBytes(32).toString('hex')}`;
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
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@evil.com', password: randomPassword }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access restricted');
  });

  it('rejects wrong password with 401', async () => {
    const wrongPassword = `wrong_${crypto.randomBytes(16).toString('hex')}`;
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: wrongPassword }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('locks account after 5 failed attempts with 429', async () => {
    for (let i = 0; i < 5; i++) {
      const wrongPassword = `wrong_${crypto.randomBytes(16).toString('hex')}`;
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: wrongPassword }),
      });
      await POST(req);
    }

    const lockedReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: dynamicTestPassword }),
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
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: dynamicTestPassword }),
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

  it('strictly fails with 500 when ADMIN_PASSWORD is unset in environment (no default password anywhere)', async () => {
    delete process.env.ADMIN_PASSWORD;
    const testPassword = crypto.randomBytes(16).toString('hex');
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: testPassword }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('ADMIN_PASSWORD environment variable is not set');
  });

  it('strictly fails with 500 in production mode if ADMIN_PASSWORD is missing', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;
    const testPassword = crypto.randomBytes(16).toString('hex');
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ziauldin371@gmail.com', password: testPassword }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('ADMIN_PASSWORD environment variable is not set');
  });
});
