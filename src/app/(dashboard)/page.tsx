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

  // Fetch data
  const { businesses: rawBusinesses } = await dataStore.getBusinesses({ limit: 100, includeDemo: showDemo });
  const rawDrafts = await dataStore.getDrafts({ limit: 100, includeDemo: showDemo });

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
  // Real replies first, then priority manual calls
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

  const totalNeedsEyes = replyDrafts.length + manualLeads.length;

  // Pipeline math
  const totalActivity = stats.totalBusinesses + stats.sentCount + stats.repliesCount;
  const foundPct = totalActivity > 0 ? Math.round((stats.totalBusinesses / totalActivity) * 100) : 0;
  const sentPct = totalActivity > 0 ? Math.round((stats.sentCount / totalActivity) * 100) : 0;
  const repliesPct = totalActivity > 0 ? Math.max(0, 100 - foundPct - sentPct) : 0;

  return (
    <div className="flex flex-col w-full gap-space-md max-w-5xl mx-auto pb-12">
      {/* Demo Banner */}
      {showDemo ? (
        <div className="rounded-xl p-space-md bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-space-sm text-tertiary shadow-sm">
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
        <div className="rounded-xl p-space-md bg-error-container/30 border border-error/40 flex items-center justify-between gap-space-sm text-on-surface shadow-sm">
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

      {/* Top Greeting & Reassurance Banner (Stitch Design) */}
      <section className="rounded-xl p-space-md sm:p-space-lg bg-surface-container shadow-md flex flex-col gap-space-sm relative overflow-hidden border border-outline-variant/20">
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-xs">
            {showDemo && (
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-label-badge uppercase tracking-wider font-bold">
                DEMO
              </span>
            )}
            <span className="font-label-md text-label-md text-secondary flex items-center gap-1.5 font-medium">
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
          <h2 className="font-headline-sm sm:font-headline-md text-headline-sm sm:text-headline-md text-on-surface flex items-center gap-2 font-bold">
            Good morning, Zia! <span className="inline-block hover:rotate-12 transition-transform cursor-default">👋</span>
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {stats.totalBusinesses > 0 || stats.sentCount > 0
              ? `Everything is running smoothly. ${stats.totalBusinesses} opportunities found, ${stats.sentCount} emails sent via Gmail, and ${stats.repliesCount} replies received.`
              : 'Nothing yet. Start by connecting your services or launching a new business search.'}
          </p>
        </div>

        {/* Quick Action Launchpad */}
        <div className="grid grid-cols-2 gap-space-sm pt-2">
          <Link
            href="/run-and-schedule"
            className="min-h-[44px] px-space-sm py-2 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg shadow-md flex items-center justify-center gap-1.5 active:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span className="truncate">Find Businesses</span>
          </Link>
          <Link
            href="/contact-manually"
            className="min-h-[44px] px-space-sm py-2 rounded-lg bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-1.5 active:bg-surface-bright transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary">phone_in_talk</span>
            <span className="truncate">Call Hot Lead</span>
          </Link>
        </div>
      </section>

      {/* Big Numbers Metric Grid (2x2 on Mobile, 4-col on Desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
        {/* Card 1: Found Today */}
        <div className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col justify-between gap-space-sm border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant truncate">Found Today</span>
            <span className="material-symbols-outlined text-[20px] text-secondary">domain</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-bold">
              {stats.totalBusinesses}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant line-clamp-1">
              Needs websites
            </span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary w-fit font-label-badge text-label-badge font-semibold">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            <span>{stats.totalBusinesses > 0 ? 'Good' : '0 Leads'}</span>
          </div>
        </div>

        {/* Card 2: Sent Safely */}
        <div className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col justify-between gap-space-sm border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant truncate">Sent Safely</span>
            <span className="material-symbols-outlined text-[20px] text-primary">forward_to_inbox</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-bold">
              {stats.sentCount}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant line-clamp-1">
              {isGmailConfigured ? 'Safe cap: 10-25/day' : 'Gmail not connected'}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full w-fit font-label-badge text-label-badge font-semibold ${
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
        <div className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col justify-between gap-space-sm border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-tertiary truncate">Hot Replies</span>
            <span className="material-symbols-outlined text-[20px] text-tertiary">mark_email_unread</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display-lg-mobile text-display-lg-mobile text-tertiary font-bold">
              {stats.repliesCount}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant line-clamp-1">
              {isGmailConfigured ? 'Real client replies' : 'Gmail not connected'}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full w-fit font-label-badge text-label-badge font-semibold ${
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
        <div className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col justify-between gap-space-sm border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant truncate">Direct Contact</span>
            <span className="material-symbols-outlined text-[20px] text-outline">contact_phone</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-bold">
              {stats.manualOutreachCount}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant line-clamp-1">
              No email found
            </span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant w-fit font-label-badge text-label-badge font-semibold">
            <span className="material-symbols-outlined text-[12px]">info</span>
            <span>Call or DM</span>
          </div>
        </div>
      </section>

      {/* Priority Feed: Needs Your Eyes Today */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-space-xs">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Needs Your Eyes Today
            </h3>
            {totalNeedsEyes > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-label-badge uppercase font-bold">
                {totalNeedsEyes} LEADS
              </span>
            )}
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant">
            {totalNeedsEyes > 0 ? 'Tap to review' : 'All clear'}
          </span>
        </div>

        {totalNeedsEyes === 0 ? (
          <div className="rounded-xl p-space-lg bg-surface-container shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-outline-variant/20 py-8">
            <span className="material-symbols-outlined text-[36px] text-secondary">task_alt</span>
            <p className="font-label-lg text-label-lg text-on-surface font-semibold">
              No urgent items needing review
            </p>
            <p className="font-body-md text-sm text-on-surface-variant max-w-md">
              You are all caught up! When leads reply or when businesses without email are discovered, they will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-space-sm">
            {/* Real Reply Cards */}
            {replyDrafts.map((d: any) => (
              <article
                key={d.id}
                className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col gap-space-sm border border-outline-variant/20"
              >
                <div className="flex items-start justify-between gap-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-label-lg text-label-lg text-on-surface leading-tight font-bold">
                        {d.businessName || 'Prospective Client'}
                      </h4>
                      <span className="font-label-md text-xs text-on-surface-variant">
                        {d.recipientEmail}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-label-badge flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                    Replied
                  </span>
                </div>

                <div className="rounded-lg p-space-sm bg-surface-container-low text-on-surface flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0 mt-0.5">chat_bubble</span>
                  <p className="font-body-md text-body-md text-on-surface italic line-clamp-2">
                    &ldquo;{d.subject || 'Client replied to your outreach email'}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-space-xs pt-1">
                  <Link
                    href={`/emails`}
                    className="min-h-[44px] flex-1 px-space-sm py-2 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg shadow-sm flex items-center justify-center gap-1 active:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>View &amp; Reply</span>
                  </Link>
                </div>
              </article>
            ))}

            {/* Manual Call Leads */}
            {manualLeads.map((b) => {
              const phone = b.phone || b.contacts?.find((c) => c.phone)?.phone;
              const rating = (b as any).rating || (b.evidence?.[0]?.metadata as any)?.rating;
              const oppText = b.evidence?.[0]?.summary || b.score?.reasoning || 'Active local business without website. Phone verified.';
              return (
                <article
                  key={b.id}
                  className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col gap-space-sm border border-outline-variant/20"
                >
                  <div className="flex items-start justify-between gap-space-xs">
                    <div className="flex items-center gap-space-xs">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-label-lg text-label-lg text-on-surface leading-tight font-bold">
                            {b.name}
                          </h4>
                          {showDemo && isDemoOrSandboxRecord(b) && (
                            <span className="px-1.5 py-0.2 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[9px] uppercase font-bold">
                              DEMO
                            </span>
                          )}
                        </div>
                        <span className="font-label-md text-xs text-on-surface-variant">
                          {[b.city, b.industry].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-fixed-dim font-label-badge text-label-badge flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[10px]">phone</span>
                      Needs Call
                    </span>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                    {rating ? `${rating}★ on Google Maps. ` : ''}
                    {oppText}
                  </p>

                  {phone && (
                    <div className="flex items-center justify-between rounded-lg p-space-sm bg-surface-container-low">
                      <span className="font-label-lg text-label-lg text-on-surface font-mono">
                        {phone}
                      </span>
                      <a
                        href={`tel:${phone}`}
                        className="min-h-[44px] px-space-md py-2 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg flex items-center gap-1.5 active:opacity-90 transition-opacity font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                        <span>Tap to Call</span>
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Visual Activity Bar: Today's Pipeline */}
      <section className="rounded-xl p-space-md bg-surface-container shadow-sm flex flex-col gap-space-sm border border-outline-variant/20">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Today&apos;s Pipeline
          </h3>
          <span className="font-label-md text-label-md text-secondary font-medium">
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

      {/* Trust & Safe Sender Shield (Honest version, no false claims) */}
      <section className="rounded-xl p-space-md bg-surface-container-low shadow-sm flex flex-col gap-space-sm border border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
          <div className="flex flex-col">
            <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
              Gmail Safety Shield Active
            </h4>
            <span className="font-label-md text-xs text-secondary font-medium">
              {isGmailConfigured ? 'Sender: ziauldin371@gmail.com (Connected)' : 'Gmail not connected'}
            </span>
          </div>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          Growth System pauses for 2-5 minutes between emails to stay within safe sending limits.
          Inbox placement cannot be guaranteed by any automated provider.
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-xs">
            <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
            <span>Local workspace safe</span>
          </div>
          <Link
            href="/safety"
            className="min-h-[44px] px-3 py-1 flex items-center text-primary hover:underline font-label-md text-xs font-semibold"
          >
            Adjust Safe Limits
          </Link>
        </div>
      </section>
    </div>
  );
}
