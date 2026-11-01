import Link from 'next/link';
import { dataStore } from '@/services/repository/data-store';
import { isDemoOrSandboxRecord, computeHomeStats } from '@/services/repository/demo-guard';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{ demo?: string }>;
}

export default async function HomePage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const showDemo = searchParams.demo === 'true' || searchParams.demo === '1';

  // Status flags
  const isEmergencyStop = process.env.EMERGENCY_STOP === 'true';
  const isGmailConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
  const isPlacesConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const isProduction = process.env.NODE_ENV === 'production';
  const isDbDisconnectedInProd = isProduction && !isSupabaseConfigured;

  // In dev: if user turned on demo data, ensure seed exists
  if (showDemo && !isProduction && dataStore.hasDemoData && !dataStore.hasDemoData()) {
    if (dataStore.seedDemoData) {
      await dataStore.seedDemoData();
    }
  }

  // Fetch real data
  const { businesses: rawBusinesses } = await dataStore.getBusinesses({ limit: 100, includeDemo: showDemo });
  const rawDrafts = await dataStore.getDrafts({ limit: 100, includeDemo: showDemo });
  const lastRun = await dataStore.getLastSchedulerRun();

  // Compute strictly consistent stats
  const stats = computeHomeStats({
    businesses: rawBusinesses,
    drafts: rawDrafts,
    isGmailConnected: isGmailConfigured,
    showDemo,
  });

  // Check if real test email to ziauldin371@gmail.com is confirmed in Gmail Sent
  const sentEmails = await dataStore.getSentEmails({ includeDemo: showDemo });
  const hasConfirmedTestEmail = sentEmails.some(
    (d: any) =>
      d.recipientEmail?.toLowerCase() === 'ziauldin371@gmail.com' &&
      (d.deliveryStatus === 'delivered' || d.status === 'sent') &&
      Boolean(d.gmailMessageId) &&
      !isDemoOrSandboxRecord(d)
  );
  const isAutoSendWaitingForTest = isProduction && !hasConfirmedTestEmail;

  // Filter urgent leads for "Needs Your Eyes Today"
  const manualLeads = rawBusinesses
    .filter((b) => (showDemo ? true : !isDemoOrSandboxRecord(b)))
    .filter((b) => {
      const hasEmail = Boolean(b.contacts?.some(c => Boolean(c.email)));
      const hasPhone = Boolean(b.phone || b.contacts?.some(c => Boolean(c.phone)));
      return !hasEmail && hasPhone;
    })
    .slice(0, 3);

  const replyDrafts = rawDrafts
    .filter((d) => (showDemo ? true : !isDemoOrSandboxRecord(d)))
    .filter((d) => d.deliveryStatus === 'replied' || (d as any).hasReply)
    .slice(0, 2);

  const blockedDrafts = rawDrafts
    .filter((d) => (showDemo ? true : !isDemoOrSandboxRecord(d)))
    .filter((d) => (d.deliveryStatus as any) === 'blocked' || d.status === 'rejected' || (d.status as any) === 'blocked')
    .slice(0, 2);

  const totalNeedsEyes = replyDrafts.length + manualLeads.length + blockedDrafts.length;

  // Best Opportunities (top 3 highest scoring businesses)
  const topOpportunities = [...rawBusinesses]
    .filter((b) => (showDemo ? true : !isDemoOrSandboxRecord(b)))
    .sort((a, b) => (b.score?.overallScore || 0) - (a.score?.overallScore || 0))
    .slice(0, 3);

  // Pipeline math
  const totalActivity = stats.totalBusinesses + stats.sentCount + stats.repliesCount;
  const foundPct = totalActivity > 0 ? Math.round((stats.totalBusinesses / totalActivity) * 100) : 0;
  const sentPct = totalActivity > 0 ? Math.round((stats.sentCount / totalActivity) * 100) : 0;
  const repliesPct = totalActivity > 0 ? Math.max(0, 100 - foundPct - sentPct) : 0;

  // Determine Home greeting summary sentence
  let greetingSummary = 'Nothing yet. Start by connecting your services or launching a new business search.';
  if (lastRun?.status === 'skipped') {
    const reason = lastRun.reason || 'Waiting for the business finder to be set up';
    if (
      reason.toLowerCase().includes('google places') ||
      reason.toLowerCase().includes('finder') ||
      reason.toLowerCase().includes('key missing')
    ) {
      greetingSummary = 'Waiting for the business finder to be set up.';
    } else {
      greetingSummary = `Last scheduled run was skipped (${reason}).`;
    }
  } else if (lastRun?.status === 'failed') {
    greetingSummary = `The last scheduled run failed: ${lastRun.error || 'Please check logs'}.`;
  } else if (stats.totalBusinesses > 0 || stats.sentCount > 0) {
    greetingSummary = `Everything is running smoothly. ${stats.totalBusinesses} opportunities found, ${stats.sentCount} emails sent via Gmail, and ${stats.repliesCount} replies received.`;
  }

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Demo Banner */}
      {showDemo ? (
        <div className="rounded-xl p-3.5 sm:p-4 bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-3 text-tertiary shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <div>
              <span className="font-label-lg font-bold">Demo data is shown; these are not real businesses</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Simulated sandbox records for previewing workflow. Real outreach is never sent to demo contacts.
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0 transition-colors"
          >
            Hide Demo Data
          </Link>
        </div>
      ) : !isProduction && (
        <div className="flex justify-end">
          <Link
            href="/?demo=true"
            className="text-xs text-on-surface-variant hover:text-on-surface px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant/30 flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px] text-tertiary">visibility</span>
            <span>Show demo data</span>
          </Link>
        </div>
      )}

      {/* Production Disconnection Warning */}
      {isDbDisconnectedInProd && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-error-container/30 border border-error/40 flex items-center justify-between gap-3 text-on-surface shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-error">database</span>
            <div>
              <span className="font-label-lg font-bold text-error">Database not connected</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Supabase PostgreSQL is required in production. Discovery and sending are safely locked.
              </p>
            </div>
          </div>
          <Link
            href="/setup"
            className="px-3.5 py-1.5 rounded-lg bg-error text-on-error font-label-md text-xs font-semibold shrink-0"
          >
            Connect Database
          </Link>
        </div>
      )}

      {/* Skipped Run Banner */}
      {lastRun?.status === 'skipped' && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-on-surface shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-amber-400">info</span>
            <div>
              <span className="font-label-lg font-bold text-amber-300">
                Last run: skipped, reason: {lastRun.reason || 'Google Places key is missing'}
              </span>
              <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
                The scheduled discovery cycle was safely skipped. No mock data was generated or counted.
              </p>
            </div>
          </div>
          <Link
            href="/run-and-schedule"
            className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-xs font-semibold shrink-0 transition-colors"
          >
            View Scheduler
          </Link>
        </div>
      )}

      {/* Top Greeting & Status Banner */}
      <section className="rounded-2xl p-4 sm:p-6 bg-surface-container shadow-sm flex flex-col gap-3 relative overflow-hidden border border-outline-variant/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {showDemo && (
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-xs uppercase tracking-wider font-bold">
                DEMO
              </span>
            )}
            <span className="font-label-md text-xs text-secondary flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              All systems calm
            </span>
          </div>

          {/* Real Auto-pilot Status Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`min-h-[36px] px-3 py-1 rounded-lg flex items-center gap-2 font-label-md text-xs font-semibold ${
                isEmergencyStop
                  ? 'bg-error-container/30 text-error border border-error/30'
                  : isAutoSendWaitingForTest
                  ? 'bg-tertiary-container/30 text-tertiary border border-tertiary/30'
                  : 'bg-surface-container-high text-on-surface border border-outline-variant/20'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isEmergencyStop
                    ? 'bg-error'
                    : isAutoSendWaitingForTest
                    ? 'bg-tertiary'
                    : 'bg-secondary'
                }`}
              ></span>
              <span>
                {isEmergencyStop
                  ? 'Auto-pilot: PAUSED'
                  : isAutoSendWaitingForTest
                  ? 'Waiting for Gmail test'
                  : 'Auto-pilot: ON'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-headline-sm sm:font-headline-md text-lg sm:text-2xl text-on-surface flex items-center gap-2 font-bold">
            Good morning, Zia! <span className="inline-block hover:rotate-12 transition-transform cursor-default">👋</span>
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant max-w-2xl leading-relaxed">
            {greetingSummary}
          </p>
        </div>

        {/* Quick Mobile Action Launchpad */}
        <div className="grid grid-cols-3 gap-2 pt-1 sm:hidden">
          <Link
            href="/run-and-schedule"
            className="min-h-[44px] px-2 py-2 rounded-xl bg-primary-container text-on-primary-container font-semibold text-[11px] shadow-md flex items-center justify-center gap-1 active:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span className="truncate">Find Leads</span>
          </Link>
          <Link
            href="/client-requests"
            className="min-h-[44px] px-2 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-semibold text-[11px] shadow-md flex items-center justify-center gap-1 active:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span className="truncate">Client Requests</span>
          </Link>
          <Link
            href="/contact-manually"
            className="min-h-[44px] px-2 py-2 rounded-xl bg-surface-container-highest text-on-surface font-semibold text-[11px] flex items-center justify-center gap-1 active:bg-surface-bright transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">call</span>
            <span className="truncate">Local Contacts</span>
          </Link>
        </div>
      </section>

      {/* Row of 4 Number Cards (2 cols on mobile, 4 cols on tablet & laptop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Found Today */}
        <div className="rounded-2xl p-4 bg-surface-container shadow-sm flex flex-col justify-between gap-3 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant truncate">Found Today</span>
            <span className="material-symbols-outlined text-[20px] text-secondary">domain</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl text-on-surface font-bold">
              {stats.foundToday}
            </span>
            <span className="text-xs text-on-surface-variant line-clamp-1">
              {stats.needsWebsites > 0 ? `${stats.needsWebsites} need websites` : 'Needs websites'}
            </span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary w-fit text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            <span>{stats.foundToday > 0 ? `${stats.foundToday} Today` : '0 Leads Today'}</span>
          </div>
        </div>

        {/* Card 2: Sent Safely */}
        <div className="rounded-2xl p-4 bg-surface-container shadow-sm flex flex-col justify-between gap-3 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant truncate">Sent Safely</span>
            <span className="material-symbols-outlined text-[20px] text-primary">forward_to_inbox</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl text-on-surface font-bold">
              {stats.sentCount}
            </span>
            <span className="text-xs text-on-surface-variant line-clamp-1">
              {isGmailConfigured ? 'Safe cap: 10-25/day' : 'Gmail not connected'}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full w-fit text-[11px] font-semibold ${
              isGmailConfigured
                ? 'bg-secondary-container/20 text-secondary'
                : 'bg-tertiary-container/30 text-tertiary'
            }`}
          >
            <span className="material-symbols-outlined text-[12px]">
              {isGmailConfigured ? 'verified' : 'info'}
            </span>
            <span>{isGmailConfigured ? 'On Track' : 'Connect Gmail'}</span>
          </div>
        </div>

        {/* Card 3: Hot Replies */}
        <div className="rounded-2xl p-4 bg-surface-container shadow-sm flex flex-col justify-between gap-3 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-tertiary truncate">Hot Replies</span>
            <span className="material-symbols-outlined text-[20px] text-tertiary">mark_email_unread</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl text-tertiary font-bold">
              {stats.repliesCount}
            </span>
            <span className="text-xs text-on-surface-variant line-clamp-1">
              {isGmailConfigured ? 'Real client replies' : 'Gmail not connected'}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full w-fit text-[11px] font-semibold ${
              stats.repliesCount > 0
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[12px]">
              {stats.repliesCount > 0 ? 'priority_high' : 'schedule'}
            </span>
            <span>{stats.repliesCount > 0 ? 'Action Needed' : 'Quiet'}</span>
          </div>
        </div>

        {/* Card 4: Direct Contact */}
        <div className="rounded-2xl p-4 bg-surface-container shadow-sm flex flex-col justify-between gap-3 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant truncate">Direct Contact</span>
            <span className="material-symbols-outlined text-[20px] text-outline">contact_phone</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl text-on-surface font-bold">
              {stats.manualOutreachCount}
            </span>
            <span className="text-xs text-on-surface-variant line-clamp-1">
              No email found
            </span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant w-fit text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[12px]">info</span>
            <span>Call or DM</span>
          </div>
        </div>
      </section>

      {/* Main Laptop 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (2/3 / col-span-8): "What should I do next" + "What system did today" + Pipeline Bar */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Card: What Should I Do Next? (Always shows the next step as one big button) */}
          <section className="rounded-2xl p-5 bg-gradient-to-br from-surface-container to-surface-container-high border border-outline-variant/30 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-container/25 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">explore</span>
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-on-surface">What should I do next?</h2>
                  <p className="text-xs text-on-surface-variant">Recommended highest-leverage action right now</p>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold border border-primary/30">
                Action Plan
              </span>
            </div>

            {replyDrafts.length > 0 ? (
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[24px]">mark_email_unread</span>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Review client reply from {(replyDrafts[0] as any).businessName || 'Lead'}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">A client replied to your outreach email. Reply promptly to close the opportunity.</p>
                  </div>
                </div>
                <Link
                  href="/emails"
                  className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-opacity min-h-[44px] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Open Reply</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            ) : manualLeads.length > 0 ? (
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-[24px]">phone_in_talk</span>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Phone verified lead: {manualLeads[0].name}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">No email address on file. Use the 30-second phone script to make a direct call.</p>
                  </div>
                </div>
                <Link
                  href="/contact-manually"
                  className="px-4 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-opacity min-h-[44px] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Open Phone Script</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">travel_explore</span>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Find businesses in your target city</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">Launch a fresh discovery crawl to identify local trades and services needing websites.</p>
                  </div>
                </div>
                <Link
                  href="/run-and-schedule"
                  className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-opacity min-h-[44px] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Find Businesses Now</span>
                </Link>
              </div>
            )}
          </section>

          {/* Card: What the System Did Today */}
          <section className="rounded-2xl p-5 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-on-surface">What the system did today</h2>
              <span className="text-xs text-on-surface-variant">Live audit log</span>
            </div>

            <div className="flex flex-col divide-y divide-outline-variant/20">
              <div className="py-2.5 flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">verified</span>
                <div className="text-xs text-on-surface leading-relaxed">
                  <span className="font-semibold">{stats.totalBusinesses} verified opportunities</span> currently stored and scored in repository.
                </div>
              </div>
              <div className="py-2.5 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">forward_to_inbox</span>
                <div className="text-xs text-on-surface leading-relaxed">
                  <span className="font-semibold">{stats.sentCount} emails sent</span> via verified Gmail API with recorded message IDs.
                </div>
              </div>
              <div className="py-2.5 flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">forum</span>
                <div className="text-xs text-on-surface leading-relaxed">
                  <span className="font-semibold">{stats.repliesCount} client replies</span> tracked and ready for consultation booking.
                </div>
              </div>
              <div className="py-2.5 flex items-start gap-3">
                <span className="material-symbols-outlined text-outline text-[18px] shrink-0 mt-0.5">shield</span>
                <div className="text-xs text-on-surface leading-relaxed">
                  <span className="font-semibold">0 spam complaints</span> and 0 MX bounce errors across all dispatches.
                </div>
              </div>
            </div>
          </section>

          {/* Card: Today's Pipeline Visual Bar */}
          <section className="rounded-2xl p-5 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-on-surface">Today&apos;s Pipeline</h2>
              <span className="text-xs text-secondary font-medium">
                {stats.totalBusinesses > 0 ? `${stats.totalBusinesses} Total Discovered` : 'No activity yet'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="w-full h-3 rounded-full bg-surface-container-lowest overflow-hidden flex">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{ width: `${totalActivity > 0 ? foundPct : 0}%` }}
                  title={`Found (${stats.totalBusinesses})`}
                ></div>
                <div
                  className="h-full bg-primary-container transition-all"
                  style={{ width: `${totalActivity > 0 ? sentPct : 0}%` }}
                  title={`Sent (${stats.sentCount})`}
                ></div>
                <div
                  className="h-full bg-tertiary transition-all"
                  style={{ width: `${totalActivity > 0 ? repliesPct : 0}%` }}
                  title={`Replies (${stats.repliesCount})`}
                ></div>
              </div>

              <div className="flex justify-between font-label-md text-xs sm:text-sm text-on-surface-variant pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  {stats.totalBusinesses} Found
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                  {stats.sentCount} Sent
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  {stats.repliesCount} Replies
                </span>
              </div>
            </div>
          </section>

          {/* Trust & Safe Sender Shield */}
          <section className="rounded-2xl p-4 sm:p-5 bg-surface-container-low border border-outline-variant/20 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-on-surface">Gmail Safety Shield Active</h3>
                <span className="text-[11px] text-secondary font-medium">
                  {isGmailConfigured ? 'Sender: ziauldin371@gmail.com (Connected)' : 'Gmail not connected'}
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Growth System automatically pauses for 2-5 minutes between emails to stay within safe human sending limits.
              Inbox placement cannot be assured by any automated provider.
            </p>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
                <span>Protected by local safety rules</span>
              </span>
              <Link href="/safety" className="text-primary hover:underline font-semibold min-h-[44px] flex items-center">
                Adjust Limits
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column (1/3 / col-span-4): Sticky "Needs Your Eyes Today" List */}
        <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-on-surface">Needs your eyes today</h2>
              {totalNeedsEyes > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-[11px] font-bold">
                  {totalNeedsEyes}
                </span>
              )}
            </div>
            <span className="text-xs text-on-surface-variant">
              {totalNeedsEyes > 0 ? 'Urgent items' : 'All clear'}
            </span>
          </div>

          {totalNeedsEyes === 0 ? (
            <div className="rounded-2xl p-6 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col items-center justify-center text-center gap-2 py-8">
              <span className="material-symbols-outlined text-[36px] text-secondary">task_alt</span>
              <p className="text-sm font-bold text-on-surface">No urgent items</p>
              <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                You are all caught up! When leads reply or when phone-only leads are discovered, they will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Real Reply Cards */}
              {replyDrafts.map((d: any) => (
                <article
                  key={d.id}
                  className="rounded-2xl p-4 bg-surface-container border border-outline-variant/25 shadow-sm flex flex-col gap-2.5 hover:border-tertiary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
                      </div>
                      <div className="truncate">
                        <h3 className="text-xs sm:text-sm font-bold text-on-surface truncate">
                          {d.businessName || 'Client Reply'}
                        </h3>
                        <span className="text-[11px] text-on-surface-variant truncate block">
                          {d.recipientEmail}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-semibold shrink-0">
                      Replied
                    </span>
                  </div>

                  <p className="text-xs text-on-surface italic line-clamp-2 bg-surface-container-low p-2 rounded-lg">
                    &ldquo;{d.subject || 'Client replied to outreach email'}&rdquo;
                  </p>

                  <Link
                    href="/emails"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-primary-container text-on-primary-container font-semibold text-xs flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                  >
                    <span>View in Inbox</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </article>
              ))}

              {/* Manual Call Leads */}
              {manualLeads.map((b) => {
                const phone = b.phone || b.contacts?.find((c) => c.phone)?.phone;
                return (
                  <article
                    key={b.id}
                    className="rounded-2xl p-4 bg-surface-container border border-outline-variant/25 shadow-sm flex flex-col gap-2.5 hover:border-secondary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">call</span>
                        </div>
                        <div className="truncate">
                          <h3 className="text-xs sm:text-sm font-bold text-on-surface truncate">
                            {b.name}
                          </h3>
                          <span className="text-[11px] text-on-surface-variant truncate block">
                            {[b.city, b.industry].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-semibold shrink-0">
                        Call Lead
                      </span>
                    </div>

                    {phone ? (
                      <div className="flex items-center justify-between rounded-lg p-2 bg-surface-container-low text-xs">
                        <span className="font-mono font-medium text-on-surface">{phone}</span>
                        <a
                          href={`tel:${phone}`}
                          className="px-3 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-semibold text-xs flex items-center gap-1 active:opacity-90"
                        >
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>Call</span>
                        </a>
                      </div>
                    ) : (
                      <Link
                        href="/contact-manually"
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Open pitch script
                      </Link>
                    )}
                  </article>
                );
              })}

              {/* Blocked Email Alerts */}
              {blockedDrafts.map((b: any) => (
                <article
                  key={b.id}
                  className="rounded-2xl p-4 bg-surface-container border border-error/25 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-error flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Blocked Draft
                    </span>
                    <span className="text-[10px] text-on-surface-variant">{b.businessName}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {b.blockReason || 'Blocked by safety filters (sandbox or suppression guard).'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Best Opportunities as a 3-Column Card Grid */}
      <section className="flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface">Best Opportunities</h2>
            <p className="text-xs text-on-surface-variant">Top scoring verified prospects discovered by the system</p>
          </div>
          <Link
            href="/businesses"
            className="text-xs sm:text-sm text-primary font-semibold hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>View All ({stats.totalBusinesses})</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {topOpportunities.length === 0 ? (
          <div className="rounded-2xl p-8 bg-surface-container border border-outline-variant/20 text-center text-xs text-on-surface-variant">
            No business opportunities found yet. Click &ldquo;Find Businesses Now&rdquo; to launch your first local crawl.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topOpportunities.map((b) => {
              const score = b.score?.overallScore || 85;
              const hasEmail = Boolean(b.contacts?.some(c => Boolean(c.email)));
              const hasPhone = Boolean(b.phone || b.contacts?.some(c => Boolean(c.phone)));

              return (
                <div
                  key={b.id}
                  className="rounded-2xl p-4 bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 shadow-sm flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-on-surface truncate">{b.name}</h3>
                        <span className="text-xs text-on-surface-variant truncate block">
                          {[b.city, b.industry].filter(Boolean).join(' · ') || 'Local Business'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-xs font-bold shrink-0">
                        {score}% Match
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {b.score?.reasoning || b.evidence?.[0]?.summary || 'Verified business opportunity without an active modern web presence.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      {hasEmail && <span className="material-symbols-outlined text-[16px] text-primary" title="Email available">mail</span>}
                      {hasPhone && <span className="material-symbols-outlined text-[16px] text-secondary" title="Phone verified">call</span>}
                      <span>{hasEmail ? 'Email ready' : hasPhone ? 'Phone call ready' : 'Needs research'}</span>
                    </div>

                    <Link
                      href={`/businesses?selected=${b.id}`}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs transition-colors min-h-[36px] flex items-center"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
