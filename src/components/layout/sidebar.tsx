'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Search, 
  Globe, 
  Cpu, 
  MailCheck, 
  Send, 
  ShieldAlert, 
  Activity, 
  Settings,
  Sparkles,
  Users,
  CheckCircle2,
  Mail,
  Share2,
  Layers,
  HelpCircle,
  History,
  LogOut,
  Flame
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Today at a Glance', description: 'Overview, health & metrics', icon: LayoutDashboard },
  { href: '/hot-opportunities', label: 'Hot Intent Radar', description: 'People asking for skills now', icon: Flame, badge: 'Warm Leads' },
  { href: '/leads', label: 'Worldwide Leads', description: 'All discovered businesses', icon: Users, badge: 'All Sources' },
  { href: '/ready-for-email', label: 'Ready for Email', description: 'Passed safety gates', icon: CheckCircle2, badge: 'Eligible' },
  { href: '/sent-emails', label: 'Sent Emails', description: 'Confirmed in Gmail Sent', icon: Mail, badge: 'Gmail Sent' },
  { href: '/other-channels', label: 'Other Outreach Channels', description: 'Outreach needed (manual)', icon: Share2, badge: 'Social/Phone' },
  { href: '/email-sent-plus-channels', label: 'Email Sent + Other Channels', description: 'Multi-touch reminders', icon: Layers, badge: 'Multi-Touch' },
  { href: '/no-email', label: 'No Website / Email Found', description: 'Direct contact channels', icon: HelpCircle, badge: 'Manual' },
  { href: '/pipeline-a', label: 'Needs a Website', description: 'High-conversion web intake', icon: Globe },
  { href: '/pipeline-b', label: 'Needs AI & Software', description: 'LLM & Python workflows', icon: Cpu },
  { href: '/approval-queue', label: 'Review First (Safe)', description: 'Draft review and gate check', icon: MailCheck, badge: 'Review' },
  { href: '/deliverability', label: 'Deliverability Center', description: 'SPF, DKIM & seed placement', icon: ShieldAlert, badge: 'DNS/Seeds' },
  { href: '/campaigns', label: 'Campaigns & Automation', description: 'Outreach schedules', icon: Send },
  { href: '/history', label: 'Run History & Watchdog', description: '14h watchdog & logs', icon: History },
  { href: '/compliance', label: 'Compliance & Suppression', description: 'Global opt-out list', icon: ShieldAlert },
  { href: '/settings', label: 'Integrations & Safety', description: 'API credentials & setup', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
    <aside className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Growth System <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">Agent</span>
            </div>
            <div className="text-[11px] text-slate-400">Autonomous B2B Pipeline</div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="truncate">
                  <div className="truncate leading-tight">{item.label}</div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {item.description}
                  </div>
                </div>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-indigo-700/80 border-indigo-400 text-indigo-100'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Operator Profile Banner */}
      <div className="p-4 m-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-indigo-400 mb-1">
          Owner & Operator
        </div>
        <div className="text-xs font-bold text-slate-100 truncate">Zia Ul Din</div>
        <div className="text-[11px] text-slate-300 truncate">Full Stack AI Developer</div>
        <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">ziauldin371@gmail.com</div>
        <div className="mt-2.5 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-medium">Twice-Daily (09:00, 17:00 PKT)</span>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
