'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const TABS = [
    {
      href: '/',
      label: 'Today',
      sublabel: 'Home',
      icon: 'today',
      exact: true,
    },
    {
      href: '/businesses',
      label: 'Found',
      sublabel: 'Businesses',
      icon: 'storefront',
      exact: false,
    },
    {
      href: '/emails',
      label: 'Emails',
      sublabel: 'Sent & Queue',
      icon: 'outgoing_mail',
      exact: false,
    },
    {
      href: '/contact-manually',
      label: 'Manual',
      sublabel: 'Calls & Social',
      icon: 'call',
      exact: false,
    },
  ];

  const isMoreActive =
    pathname.startsWith('/safety') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/run-and-schedule');

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Stitch design, hidden on desktop lg:hidden) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-1px_12px_rgba(0,0,0,0.35)] lg:hidden"
      >
        <div className="flex justify-around items-stretch h-16 px-1">
          {TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1 rounded-lg transition-all gap-0.5 ${
                  isActive
                    ? 'text-primary bg-surface-container-high font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface active:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span className="font-label-md text-[11px] leading-tight">{tab.label}</span>
                <span className="font-label-badge text-[9px] opacity-70 leading-none">
                  {tab.sublabel}
                </span>
              </Link>
            );
          })}

          {/* More Tab */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            aria-label="More navigation options"
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1 rounded-lg transition-all gap-0.5 ${
              isMoreActive || showMoreMenu
                ? 'text-primary bg-surface-container-high font-semibold'
                : 'text-on-surface-variant hover:text-on-surface active:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">menu_open</span>
            <span className="font-label-md text-[11px] leading-tight">More</span>
            <span className="font-label-badge text-[9px] opacity-70 leading-none">Setup & Rules</span>
          </button>
        </div>
      </nav>

      {/* More Options Drawer Modal on Mobile */}
      {showMoreMenu && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end lg:hidden"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-surface-container rounded-t-2xl p-space-md border-t border-outline-variant/40 space-y-space-md pb-12 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">widgets</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  More Tools & Settings
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/run-and-schedule"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[22px]">play_circle</span>
                  <div>
                    <div className="font-label-lg text-label-lg font-semibold">Run & Schedule</div>
                    <div className="font-label-md text-[11px] text-on-surface-variant">
                      Find leads now & auto runs
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
              </Link>

              <Link
                href="/safety"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[22px]">shield</span>
                  <div>
                    <div className="font-label-lg text-label-lg font-semibold">Safety & Rules</div>
                    <div className="font-label-md text-[11px] text-on-surface-variant">
                      Emergency stop, sending limits & rules
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
              </Link>

              <Link
                href="/setup"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[22px]">tune</span>
                  <div>
                    <div className="font-label-lg text-label-lg font-semibold">Setup & Connections</div>
                    <div className="font-label-md text-[11px] text-on-surface-variant">
                      Gmail, API keys & database status
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-bold text-xs flex items-center justify-center">
                  ZD
                </div>
                <div>
                  <div className="font-label-md text-xs font-semibold text-on-surface">Zia Ul Din</div>
                  <div className="font-label-md text-[10px] text-on-surface-variant">ziauldin371@gmail.com</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-2 rounded-lg bg-error-container text-on-error-container font-label-md text-xs font-semibold flex items-center gap-1 active:opacity-90"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>{t('action.sign_out', 'Sign Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

