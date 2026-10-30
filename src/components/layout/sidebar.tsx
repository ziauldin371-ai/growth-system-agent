'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Mail, 
  MessageSquareShare, 
  PlayCircle, 
  ShieldCheck, 
  Settings,
  LogOut,
  Sparkles,
  User
} from 'lucide-react';
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
      icon: LayoutDashboard,
      activeExact: true
    },
    { 
      href: '/businesses', 
      label: t('nav.businesses', 'Businesses Found'), 
      description: t('nav.businesses_sub', 'No website, broken sites & hot leads'), 
      icon: Building2 
    },
    { 
      href: '/emails', 
      label: t('nav.emails', 'Emails'), 
      description: t('nav.emails_sub', 'Sent, waiting & blocked'), 
      icon: Mail 
    },
    { 
      href: '/contact-manually', 
      label: t('nav.manual', 'Contact Manually'), 
      description: t('nav.manual_sub', 'No email: social & phone pitches'), 
      icon: MessageSquareShare 
    },
    { 
      href: '/run-and-schedule', 
      label: t('nav.schedule', 'Run & Schedule'), 
      description: t('nav.schedule_sub', 'Find leads now & auto runs'), 
      icon: PlayCircle 
    },
    { 
      href: '/safety', 
      label: t('nav.safety', 'Safety'), 
      description: t('nav.safety_sub', 'Limits, emergency stop & laws'), 
      icon: ShieldCheck 
    },
    { 
      href: '/setup', 
      label: t('nav.setup', 'Setup'), 
      description: t('nav.setup_sub', 'Gmail, API keys & database'), 
      icon: Settings 
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      router.push('/login');
    }
  };

  return (
    <aside className="w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Growth System <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">Agent</span>
            </div>
            <div className="text-[11px] text-slate-400">Autonomous B2B Pipeline</div>
          </div>
        </Link>
      </div>

      {/* Primary 7 Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeExact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="truncate">
                  <div className="truncate text-xs font-semibold leading-tight">{item.label}</div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {item.description}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Operator User Profile & Logout at Bottom */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">Zia Ul Din</div>
              <div className="text-[10px] text-slate-400 truncate">Operator</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t('action.sign_out', 'Sign Out')}
            aria-label="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
