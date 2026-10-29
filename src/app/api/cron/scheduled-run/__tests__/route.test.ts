import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { automationRunner } from '@/services/scheduler/automation-runner';

vi.mock('@/services/scheduler/automation-runner', () => ({
  automationRunner: {
    executeScheduledRun: vi.fn().mockResolvedValue({ status: 'completed', processedCount: 5 }),
  },
}));

describe('/api/cron/scheduled-run security and validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects secrets passed in query string with 400', async () => {
    process.env.CRON_SECRET = 'my_secret_token_123';
    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run?secret=my_secret_token_123');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Authorization header');
  });

  it('rejects secrets passed in request body with 400', async () => {
    process.env.CRON_SECRET = 'my_secret_token_123';
    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'my_secret_token_123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Authorization header');
  });

  it('returns 503 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run', {
      headers: { Authorization: 'Bearer some_token' },
    });
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('CRON_SECRET not configured');
  });

  it('returns 401 if Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'super_secret';
    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 if Bearer token is incorrect', async () => {
    process.env.CRON_SECRET = 'super_secret';
    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run', {
      headers: { Authorization: 'Bearer wrong_secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid CRON_SECRET');
  });

  it('succeeds with 200 when valid Authorization header is provided', async () => {
    process.env.CRON_SECRET = 'super_secret';
    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run', {
      headers: { Authorization: 'Bearer super_secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(automationRunner.executeScheduledRun).toHaveBeenCalledWith('vercel_cron');
  });
});
