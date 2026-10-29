import { describe, it, expect } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import { createSessionToken } from '@/lib/security/session';

describe('Unauthenticated API Lockdown & Zero-Trust Boundary Audit (Request 5)', () => {
  const protectedApiRoutes = [
    '/api/analytics',
    '/api/automation/controls',
    '/api/businesses',
    '/api/businesses/export',
    '/api/campaigns',
    '/api/channels/ch-sample-01',
    '/api/compliance/suppression',
    '/api/deliverability/dns-check',
    '/api/discovery',
    '/api/discovery/feed',
    '/api/gmail/test-send',
    '/api/history',
    '/api/intent',
    '/api/intent/quick-add',
    '/api/intent/scan',
    '/api/jobs',
    '/api/leads',
    '/api/leads/no-email',
    '/api/leads/other-channels',
    '/api/leads/ready',
    '/api/leads/sent',
    '/api/leads/sent-plus-channels',
    '/api/outreach',
    '/api/outreach/approve',
  ];

  it('rejects unauthenticated requests to every private API route with HTTP 401 Unauthorized', async () => {
    for (const route of protectedApiRoutes) {
      const req = new NextRequest(`http://localhost:3000${route}`, {
        method: 'GET',
        headers: {
          'Host': 'localhost:3000',
        },
      });

      const response = await middleware(req);

      expect(response.status, `Route ${route} must return 401 when unauthenticated`).toBe(401);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Unauthorized');
      expect(body.error.toLowerCase()).toContain('authentication required');
    }
  });

  it('redirects unauthenticated browser requests for private dashboard pages to /login', async () => {
    const privatePages = [
      '/',
      '/leads',
      '/ready-for-email',
      '/sent-emails',
      '/other-channels',
      '/email-sent-plus-channels',
      '/hot-opportunities',
      '/pipeline-a',
      '/pipeline-b',
      '/approval-queue',
      '/settings',
      '/history',
      '/compliance',
    ];

    for (const page of privatePages) {
      const req = new NextRequest(`http://localhost:3000${page}`, {
        method: 'GET',
        headers: {
          'Host': 'localhost:3000',
        },
      });

      const response = await middleware(req);

      expect(response.status, `Page ${page} must redirect when unauthenticated`).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/login');
    }
  });

  it('allows authenticated requests carrying valid signed admin session cookie', async () => {
    const signedToken = await createSessionToken({
      email: 'ziauldin371@gmail.com',
      name: 'Zia Ul Din',
      role: 'owner',
    });

    const req = new NextRequest('http://localhost:3000/api/leads', {
      method: 'GET',
      headers: {
        'Host': 'localhost:3000',
        'Cookie': `growth_agent_session=${signedToken};`,
      },
    });

    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});
