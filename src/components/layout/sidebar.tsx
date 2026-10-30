'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const NAV_ITEMS = [
    {
      href: '/',
      label: t('nav.home', 'Home'),
      description: t('nav.home_sub', 'Today at a glance'),
      icon: 'today',
      activeExact: true,
    },
    {
      href: '/businesses',
      label: t('nav.businesses', 'Businesses Found'),
      description: t('nav.businesses_sub', 'No website, broken & hot leads'),
      icon: 'storefront',
    },
    {
      href: '/emails',
      label: t('nav.emails', 'Emails'),
      description: t('nav.emails_sub', 'Sent, waiting & blocked'),
      icon: 'outgoing_mail',
    },
    {
      href: '/contact-manually',
      label: t('nav.manual', 'Contact Manually'),
      description: t('nav.manual_sub', 'No email: phone & social pitches'),
      icon: 'call',
    },
    {
      href: '/run-and-schedule',
      label: t('nav.schedule', 'Run & Schedule'),
      description: t('nav.schedule_sub', 'Find leads now & auto runs'),
      icon: 'play_circle',
    },
    {
      href: '/safety',
      label: t('nav.safety', 'Safety'),
      description: t('nav.safety_sub', 'Limits, emergency stop & laws'),
      icon: 'shield',
    },
    {
      href: '/setup',
      label: t('nav.setup', 'Setup'),
      description: t('nav.setup_sub', 'Gmail, API keys & database'),
      icon: 'tune',
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <aside className="hidden lg:flex w-64 bg-surface-container-low border-r border-outline-variant/30 flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-outline-variant/30">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-container via-indigo-600 to-primary flex items-center justify-center shadow-lg shadow-primary-container/20 group-hover:scale-105 transition-transform text-on-primary-container">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </div>
          <div className="truncate">
            <div className="font-bold text-sm tracking-tight text-on-surface flex items-center gap-1.5 truncate">
              Growth System <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold border border-primary-container/30">Agent</span>
            </div>
            <div className="text-[11px] text-on-surface-variant truncate">Simple Client Finder</div>
          </div>
        </Link>
      </div>

      {/* Primary 7 Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.activeExact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/25'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <span
                  className={`material-symbols-outlined text-[20px] shrink-0 ${
                    isActive ? 'text-on-primary-container' : 'text-on-surface-variant'
                  }`}
                >
                  {item.icon}
                </span>
                <div className="truncate">
                  <div className="truncate text-xs font-semibold leading-tight">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-on-primary-container/80' : 'text-on-surface-variant/80'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Operator User Profile & Logout at Bottom */}
      <div className="p-3 border-t border-outline-variant/30 bg-surface-container-lowest/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary border border-primary-container/30 flex items-center justify-center shrink-0 font-bold text-xs">
              ZD
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-on-surface truncate">Zia Ul Din</div>
              <div className="text-[10px] text-on-surface-variant truncate">Operator</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t('action.sign_out', 'Sign Out')}
            aria-label="Sign Out"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
