import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/security/session';

// Whitelist of public routes accessible without an active admin session
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/compliance/unsubscribe',
  '/api/webhooks/resend',
  '/api/cron/scheduled-run',
  '/api/auth/gmail/callback',
  '/api/health',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow static assets and Next.js internal paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  // 2. Allow whitelisted public endpoints
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // 3. Cryptographically verify session token (HMAC-SHA256 / JWT)
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    const verification = await verifySessionToken(sessionCookie);
    if (verification.valid) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    // If requesting an API route, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Growth System Agent is private. Cryptographically verified authentication required.',
        },
        { status: 401 }
      );
    }

    // For web dashboard routes, redirect to /login with return destination
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

