import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('/api/readiness endpoint (private & authenticated)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ADMIN_PASSWORD;
    delete process.env.CRON_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/readiness');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Unauthorized');
  });

  it('allows access with valid Bearer token and reports all missing services when unconfigured', async () => {
    process.env.ADMIN_PASSWORD = 'test_admin_pass';

    const req = new NextRequest('http://localhost:3000/api/readiness', {
      headers: {
        Authorization: 'Bearer test_admin_pass',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ready).toBe(false);
    expect(body.status).toBe('not_ready');
    expect(body.missing).toEqual(
      expect.arrayContaining(['database', 'gmail', 'places_key', 'gemini_key', 'scheduler_secret'])
    );
  });

  it('reports configured when environment variables are set', async () => {
    process.env.ADMIN_PASSWORD = 'test_admin_pass';
    process.env.GOOGLE_CLIENT_ID = 'test_cid';
    process.env.GOOGLE_REFRESH_TOKEN = 'test_rt';
    process.env.GOOGLE_PLACES_API_KEY = 'test_places';
    process.env.GEMINI_API_KEY = 'test_gemini';
    process.env.CRON_SECRET = 'test_cron_sec';

    const req = new NextRequest('http://localhost:3000/api/readiness', {
      headers: {
        Authorization: 'Bearer test_admin_pass',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.configured).toEqual(
      expect.arrayContaining(['gmail', 'places_key', 'gemini_key', 'scheduler_secret'])
    );
    // database is still missing because mock db is not live Supabase
    expect(body.missing).toContain('database');
    expect(body.services.places_key).toBe('configured');
    expect(body.services.gmail).toBe('configured');
  });
});
