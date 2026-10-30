'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextDestination = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      router.push(nextDestination);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface-container backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg bg-error-container/30 border border-error/40 flex items-start gap-2.5 text-error text-xs font-medium">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-on-surface mb-1.5">
            Authorized Administrator Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="operator@domain.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-on-surface mb-1.5 flex justify-between">
            <span>Account Password</span>
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary-container hover:opacity-95 text-on-primary-container font-semibold text-sm transition-all shadow-md shadow-primary-container/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2 min-h-[44px]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[14px]">shield</span>
          Zero-Trust Boundary
        </span>
        <span>Rate-limited access</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-container/15 border border-primary-container/30 text-primary mb-2 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <h1 className="font-headline-sm sm:font-headline-md text-2xl font-bold tracking-tight text-on-surface">
            Growth System
          </h1>
          <p className="text-sm text-on-surface-variant">
            Sign in with authorized administrator credentials
          </p>
        </div>

        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-on-surface-variant bg-surface-container rounded-2xl border border-outline-variant/30 space-y-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-on-surface font-medium">Loading authentication portal...</p>
              <p className="text-[11px] text-on-surface-variant">
                If the form does not appear, please ensure JavaScript is enabled in your browser.
              </p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
