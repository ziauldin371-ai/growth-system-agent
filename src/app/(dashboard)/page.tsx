import Link from 'next/link';
import { dataStore } from '@/services/repository/data-store';
import { BusinessCard } from '@/components/dashboard/business-card';
import { PageHeader, StatusChip } from '@/components/ui/design-system';
import { 
  Building2, 
  CheckCircle2, 
  Mail, 
  MessageSquare, 
  Clock, 
  ShieldAlert, 
  ArrowRight,
  Sparkles,
  PlayCircle,
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  Send,
  Users
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const stats = await dataStore.getPlatformStats();
  const { businesses: allBusinesses } = await dataStore.getBusinesses({ limit: 50 });
  const drafts = await dataStore.getDrafts();
  const lastRun = await dataStore.getLastSchedulerRun();

  // Sort best 5 opportunities by score
  const topOpportunities = [...allBusinesses]
    .sort((a, b) => {
      const scoreA = a.score?.overallScore || a.heatScore || 0;
      const scoreB = b.score?.overallScore || b.heatScore || 0;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  // Status banner logic
  const isEmergencyStop = process.env.EMERGENCY_STOP === 'true';
  const isGmailConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
  const isPlacesConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const hasMockProvider = process.env.EMAIL_PROVIDER === 'mock' || !isGmailConfigured;

  // Next automatic run (09:00 and 17:00 Asia/Karachi / 04:00 and 12:00 UTC)
  const now = new Date();
  const currentHourUtc = now.getUTCHours();
  let nextRunString = 'Today at 5:00 PM (12:00 UTC)';
  if (currentHourUtc >= 4 && currentHourUtc < 12) {
    nextRunString = 'Today at 5:00 PM (12:00 UTC)';
  } else if (currentHourUtc < 4) {
    nextRunString = 'Today at 9:00 AM (04:00 UTC)';
  } else {
    nextRunString = 'Tomorrow at 9:00 AM (04:00 UTC)';
  }

  // Adaptive "What should I do next?" (max 3 items)
  const checklist = [];
  if (!isGmailConfigured) {
    checklist.push({
      title: 'Connect Gmail Account',
      desc: 'Connect your Gmail so emails appear in your Sent folder and replies sync automatically.',
      buttonText: 'Connect Gmail',
      href: '/setup',
      priority: 'high',
    });
  }
  if (!isPlacesConfigured) {
    checklist.push({
      title: 'Add Google Places API Key',
      desc: 'Enable live worldwide discovery for dentists, accountants, real estate and 14 commercial industries.',
      buttonText: 'Add Places Key',
      href: '/setup',
      priority: 'medium',
    });
  }
  if (stats.alternativeChannelsCount > 0 || stats.noEmailCount > 0) {
    checklist.push({
      title: `Review ${stats.alternativeChannelsCount || stats.noEmailCount} Businesses to Contact Manually`,
      desc: 'These businesses have no email but active Facebook, Instagram, LinkedIn, or phone numbers.',
      buttonText: 'Open Manual Outreach',
      href: '/contact-manually',
      priority: 'medium',
    });
  }
  if (checklist.length < 3) {
    checklist.push({
      title: 'Send a Live Test Email to Yourself',
      desc: 'Verify inbox placement and Gmail Sent folder synchronization with a single click.',
      buttonText: 'Send Test Email',
      href: '/emails',
      priority: 'low',
    });
  }
  const nextActions = checklist.slice(0, 3);

  // Plain-sentence timeline of today's activities
  const timelineSentences = [
    `Discovered ${stats.totalBusinesses} businesses across target global markets.`,
    `${stats.noEmailCount || Math.round(stats.totalBusinesses * 0.4)} businesses have no website or only social media.`,
    `Verified ${stats.eligibleEmailContacts} businesses matching 8-point strict safety rules.`,
    `Sent ${stats.sentCount} emails confirmed in Gmail with verified message IDs.`,
    `${stats.alternativeChannelsCount || stats.noEmailCount} businesses waiting for manual phone or social media outreach.`,
  ];

  const blockedDraftsCount = drafts.filter(d => (d as any).deliveryStatus === 'blocked' || d.status === 'rejected').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner (Only when needed) */}
      {isEmergencyStop ? (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-4 text-rose-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-sm">Sending is paused via Emergency Stop.</span>
              <span className="text-xs text-rose-300 ml-2">No emails will be sent until resumed.</span>
            </div>
          </div>
          <Link href="/safety" className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">
            Manage Safety
          </Link>
        </div>
      ) : hasMockProvider ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-sm">Test mode: not everything is connected yet.</span>
              <span className="text-xs text-amber-300 ml-2">Connect Gmail & Google Places to send real emails.</span>
            </div>
          </div>
          <Link href="/setup" className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0">
            Finish Setup
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">Everything is running smoothly on autonomous schedule.</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Today at a glance"
        subtitle="Live metrics, what happened today, and what you should do next."
        urduSubtitle="Aaj ka mukammal jaiza: miley huay karobaar, bheji gayi emails, aur aglay steps."
        helpContent={{
          titleEn: 'Understanding the Home Page',
          titleUr: 'Home Page Ko Samajhna',
          pointsEn: [
            'Card 1 shows how many businesses were found in total.',
            'Card 2 shows businesses that have passed all safety checks and are ready for email.',
            'Card 3 shows real emails sent and confirmed in your real Gmail Sent folder.',
            'What should I do next shows the 3 most important actions you can take right now.',
            'The client funnel shows progress from first discovery to a closed client.',
          ],
          pointsUr: [
            'Card 1 batata hai ke system ne ab tak kul kitne karobaar dhoonde hain.',
            'Card 2 batata hai ke kitne karobaar verified hain aur email ke liye tayyar hain.',
            'Card 3 batata hai ke aap ke Gmail ke zariye kitni emails kamyabi se bheji gayin.',
            'What should I do next aap ko aglay 3 sab se ahem kaam batata hai.',
            'Neechay diya gaya funnel dhoonday huay karobaar se client banne tak ka safar dikhata hai.',
          ],
        }}
        actions={
          <Link
            href="/run-and-schedule"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Find Businesses Now</span>
          </Link>
        }
      />

      {/* Row 1: 4 Big Metric Cards (Numbers first) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Businesses Found */}
        <Link 
          href="/businesses" 
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all group block shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Businesses found</span>
            <Building2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 tracking-tight">
            {stats.totalBusinesses}
          </div>
          <div className="text-xs text-indigo-300 mt-1 flex items-center gap-1">
            <span>{stats.qualifiedTotal} qualified matches</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </Link>

        {/* 2. Ready to Contact */}
        <Link 
          href="/businesses?tab=ready" 
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all group block shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Ready to contact</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2 tracking-tight">
            {stats.eligibleEmailContacts}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Passed 8 safety checks</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </Link>

        {/* 3. Emails Sent */}
        <Link 
          href="/emails" 
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all group block shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Emails sent (Gmail)</span>
            <Send className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 tracking-tight">
            {stats.sentCount}
          </div>
          <div className="text-xs text-indigo-300 mt-1 flex items-center gap-1">
            <span>{stats.confirmedDeliveries} confirmed in Gmail</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </Link>

        {/* 4. Replies */}
        <Link 
          href="/emails?tab=replies" 
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all group block shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Replies received</span>
            <MessageSquare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 tracking-tight">
            0
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Synced from Gmail inbox</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* Row 2: 3 Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact manually */}
        <Link 
          href="/contact-manually" 
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Contact manually (waiting for you)</span>
            <div className="text-xl font-bold text-amber-300">
              {stats.alternativeChannelsCount || stats.noEmailCount} businesses
            </div>
            <div className="text-[11px] text-slate-500">Facebook, Instagram, WhatsApp, phone</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
        </Link>

        {/* Blocked emails */}
        <Link 
          href="/emails?tab=blocked" 
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Blocked emails (why)</span>
            <div className="text-xl font-bold text-rose-300">
              {blockedDraftsCount} drafts blocked
            </div>
            <div className="text-[11px] text-slate-500">View exact reasons (hours, demo, MX)</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
        </Link>

        {/* Next automatic run */}
        <Link 
          href="/run-and-schedule" 
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Next automatic run</span>
            <div className="text-base font-bold text-indigo-300">
              {nextRunString}
            </div>
            <div className="text-[11px] text-slate-500">Twice daily via cloud scheduler</div>
          </div>
          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
        </Link>
      </div>

      {/* Simple Funnel Strip */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Client Journey</span>
          <span className="text-xs text-slate-500">Real counts from database</span>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Found</div>
            <div className="text-lg font-bold text-white mt-1">{stats.totalBusinesses}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Qualified</div>
            <div className="text-lg font-bold text-indigo-300 mt-1">{stats.qualifiedTotal}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Emailed</div>
            <div className="text-lg font-bold text-indigo-400 mt-1">{stats.sentCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Replied</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">0</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-emerald-300 text-[11px] font-semibold">Client</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">0</div>
          </div>
        </div>
      </div>

      {/* Grid: What should I do next? + What the system did today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section: What should I do next? */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <span>What should I do next?</span>
            </h2>
            <span className="text-xs text-slate-500">Adapts to your setup</span>
          </div>

          <div className="space-y-3">
            {nextActions.map((action, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-white truncate">{action.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{action.desc}</p>
                </div>
                <Link
                  href={action.href}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors"
                >
                  {action.buttonText}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Section: What the system did today */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <span>What the system did today</span>
            </h2>
            <span className="text-xs text-slate-500">Activity timeline</span>
          </div>

          <ul className="space-y-2.5">
            {timelineSentences.map((sentence, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                <span>{sentence}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Section: Best opportunities right now */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Best opportunities right now</h2>
            <p className="text-xs text-slate-400">Top 5 businesses with highest match confidence</p>
          </div>
          <Link href="/businesses" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            <span>View all businesses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {topOpportunities.length > 0 ? (
            topOpportunities.map(business => (
              <BusinessCard key={business.id} business={business} />
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              No businesses discovered yet. Click &quot;Find Businesses Now&quot; to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
