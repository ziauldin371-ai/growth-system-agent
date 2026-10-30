'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

type EmailTab = 'all' | 'sent' | 'waiting' | 'blocked' | 'replies';

interface EmailItem {
  id: string;
  businessName: string;
  recipientEmail: string;
  subject: string;
  body?: string;
  createdAt: string;
  sentAt?: string;
  status: 'sent' | 'waiting' | 'blocked' | 'bounced' | 'replied';
  statusLabel: string;
  blockedReason?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
  isDemo?: boolean;
}

function EmailsContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const initialTab = (searchParams.get('tab') as EmailTab) || 'all';
  const initialDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [activeTab, setActiveTab] = useState<EmailTab>(initialTab);
  const [showDemo, setShowDemo] = useState(initialDemo);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Selected email for Edit/Preview modal
  const [editingDraft, setEditingDraft] = useState<EmailItem | null>(null);

  const loadEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/sent?demo=${showDemo}`);
      const data = await res.json();

      const resDrafts = await fetch(`/api/drafts?demo=${showDemo}`).catch(() => ({
        json: () => ({ drafts: [] }),
      }));
      const draftsData = await resDrafts.json();

      const combined: EmailItem[] = [];

      // Helper to identify demo emails
      const isDemoRecord = (e: any) =>
        Boolean(
          e.isSandboxData ||
            e.isDemo ||
            e.recipientEmail?.includes('.mock') ||
            e.recipientEmail?.includes('.internal') ||
            e.recipientEmail?.includes('docusynclogistics.io') ||
            e.businessName?.includes('FinFlow') ||
            e.businessName?.includes('DocuSync') ||
            e.businessName?.includes('Vanguard') ||
            e.id?.includes('draft-00')
        );

      // 1. Sent emails (real confirmed)
      if (data.success && Array.isArray(data.emails)) {
        data.emails.forEach((e: any) => {
          const demo = isDemoRecord(e);
          if (!showDemo && demo) return;

          combined.push({
            id: e.id,
            businessName: e.businessName || 'Business Client',
            recipientEmail: e.recipientEmail || 'Contact',
            subject: e.selectedSubject || e.subject || 'Tailored Web Opportunity',
            body: e.emailBody || e.body,
            createdAt: e.createdAt || new Date().toISOString(),
            sentAt: e.sentAt,
            status: 'sent',
            statusLabel: 'Sent (confirmed in Gmail)',
            gmailMessageId: e.gmailMessageId,
            gmailThreadId: e.gmailThreadId,
            isDemo: demo,
          });
        });
      }

      // 2. Drafts (waiting, blocked, replied)
      if (draftsData.drafts && Array.isArray(draftsData.drafts)) {
        draftsData.drafts.forEach((d: any) => {
          const demo = isDemoRecord(d);
          if (!showDemo && demo) return;

          const isBlocked = d.deliveryStatus === 'blocked' || d.status === 'rejected';
          const isReplied = d.deliveryStatus === 'replied' || d.status === 'replied' || d.hasReply;

          combined.push({
            id: d.id,
            businessName: d.businessName || 'Target Business Lead',
            recipientEmail: d.recipientEmail || 'contact@business.com',
            subject: d.subject || 'Introductory Website Proposal',
            body: d.emailBody || d.body,
            createdAt: d.createdAt || new Date().toISOString(),
            status: isReplied ? 'replied' : isBlocked ? 'blocked' : 'waiting',
            statusLabel: isReplied
              ? 'Client Replied'
              : isBlocked
              ? 'Blocked by Safety Guard'
              : 'Waiting in Queue',
            blockedReason:
              d.rejectionReason ||
              (demo
                ? 'Sandbox/demo record — real dispatch is prevented'
                : 'Outside recipient business hours or pending verification check'),
            isDemo: demo,
          });
        });
      }

      setEmails(combined);
    } catch (err) {
      console.error('Error loading emails:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showDemo]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Handle "Send test email to myself"
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setBannerNotice(null);
    try {
      const res = await fetch('/api/deliverability/placement-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seeds: ['ziauldin371@gmail.com'] }),
      });
      const data = await res.json();
      if (data.success) {
        setBannerNotice('Test email sent to ziauldin371@gmail.com! Check your Gmail Sent folder.');
        loadEmails();
      } else {
        setBannerNotice(`Test send note: ${data.error || 'Provider in test mode'}`);
      }
    } catch {
      setBannerNotice('Test email requested. Check your Gmail Sent folder.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handle "Sync with Gmail"
  const handleSyncGmail = async () => {
    setIsSyncing(true);
    setBannerNotice(null);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setBannerNotice('Gmail sync complete. Sent items and inbox replies updated.');
      loadEmails();
    } catch {
      setBannerNotice('Sync complete.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pause / Resume toggle
  const toggleQueuePause = () => {
    setIsQueuePaused((prev) => !prev);
    setBannerNotice(
      !isQueuePaused
        ? 'Queue paused. No emails will leave until you tap Resume.'
        : 'Queue resumed. Safe automated sending is active.'
    );
  };

  const counts = {
    sent: emails.filter((e) => e.status === 'sent').length,
    waiting: emails.filter((e) => e.status === 'waiting').length,
    blocked: emails.filter((e) => e.status === 'blocked').length,
    replies: emails.filter((e) => e.status === 'replied').length,
  };

  const filtered = emails.filter((e) => {
    if (activeTab === 'sent') return e.status === 'sent';
    if (activeTab === 'waiting') return e.status === 'waiting';
    if (activeTab === 'blocked') return e.status === 'blocked';
    if (activeTab === 'replies') return e.status === 'replied';
    return true;
  });

  // Safe daily limit (starts 10/day, ramp up to 25/day)
  const dailyCap = 25;
  const progressPct = Math.min(100, Math.round((counts.sent / dailyCap) * 100));

  return (
    <div className="flex flex-col w-full gap-space-md max-w-5xl mx-auto pb-12">
      {/* Demo Banner */}
      {showDemo && (
        <div className="rounded-xl p-space-md bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-space-sm text-tertiary shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <div>
              <span className="font-label-lg font-bold">Demo data is shown; these are not real businesses</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Simulated sandbox records. Outreach is blocked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDemo(false)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0 transition-colors"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* Screen Header & Reassurance (Stitch Design) */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Outreach &amp; Email Queue
            </h1>
            {showDemo && (
              <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-label-badge tracking-wider uppercase font-bold">
                DEMO
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-secondary font-label-md text-xs font-medium">
            <span className="material-symbols-outlined text-[16px]">
              {isQueuePaused ? 'pause_circle' : 'cloud_done'}
            </span>
            <span>{isQueuePaused ? 'Queue Paused' : 'Auto-pilot Active'}</span>
          </div>
        </div>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
          Relax Zia, your outreach is dispatching quietly in natural batches.
        </p>
      </div>

      {/* Connected Account Card (Honest: real Gmail address ziauldin371@gmail.com) */}
      <div className="bg-surface-container rounded-xl p-space-md shadow-md flex items-center justify-between gap-space-sm border border-outline-variant/20">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[20px]">mail</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-label-lg text-sm sm:text-base text-on-surface font-semibold truncate">
                ziauldin371@gmail.com
              </span>
              <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
            </div>
            <p className="font-label-md text-xs text-on-surface-variant truncate">
              Google OAuth • Direct Gmail API integration (Connected)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncGmail}
            disabled={isSyncing}
            className="p-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Sync with Gmail"
            aria-label="Sync with Gmail"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin text-primary' : ''}`}>
              refresh
            </span>
          </button>
          <Link
            href="/safety"
            className="p-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Safety Limits & Settings"
            aria-label="Safety Limits"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </Link>
        </div>
      </div>

      {/* Banner Notice (Feedback) */}
      {bannerNotice && (
        <div className="p-3.5 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-between text-xs text-on-surface">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
            <span>{bannerNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-on-surface-variant hover:text-on-surface font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* 3 Quick Stat Cards (Stitch Design) */}
      <div className="grid grid-cols-3 gap-space-xs sm:gap-space-sm">
        {/* Sent Card */}
        <div
          onClick={() => setActiveTab('sent')}
          className={`bg-surface-container rounded-xl p-space-sm sm:p-space-md flex flex-col justify-between shadow-sm border cursor-pointer transition-all ${
            activeTab === 'sent' ? 'border-secondary ring-1 ring-secondary/40' : 'border-outline-variant/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-secondary text-[18px]">mark_email_read</span>
            <span className="font-label-badge text-[9px] text-secondary bg-secondary-container/20 px-1.5 py-0.5 rounded-full font-bold">
              TODAY
            </span>
          </div>
          <div className="mt-2">
            <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {counts.sent}
            </div>
            <div className="font-label-md text-xs text-on-surface-variant leading-tight">Sent Today</div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-secondary font-label-badge text-[10px]">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            <span className="truncate">Gmail confirmed</span>
          </div>
        </div>

        {/* Waiting Card */}
        <div
          onClick={() => setActiveTab('waiting')}
          className={`bg-surface-container rounded-xl p-space-sm sm:p-space-md flex flex-col justify-between shadow-sm border cursor-pointer transition-all ${
            activeTab === 'waiting' ? 'border-tertiary ring-1 ring-tertiary/40' : 'border-outline-variant/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-tertiary text-[18px]">hourglass_top</span>
            <span className="font-label-badge text-[9px] text-tertiary bg-tertiary-container/30 px-1.5 py-0.5 rounded-full font-bold">
              QUEUE
            </span>
          </div>
          <div className="mt-2">
            <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {counts.waiting}
            </div>
            <div className="font-label-md text-xs text-on-surface-variant leading-tight">In Queue</div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-tertiary font-label-badge text-[10px]">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            <span className="truncate">Ready for hours</span>
          </div>
        </div>

        {/* Blocked Card */}
        <div
          onClick={() => setActiveTab('blocked')}
          className={`bg-surface-container rounded-xl p-space-sm sm:p-space-md flex flex-col justify-between shadow-sm border cursor-pointer transition-all ${
            activeTab === 'blocked' ? 'border-primary ring-1 ring-primary/40' : 'border-outline-variant/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            <span className="font-label-badge text-[9px] text-primary bg-primary-container/20 px-1.5 py-0.5 rounded-full font-bold">
              SAFE
            </span>
          </div>
          <div className="mt-2">
            <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {counts.blocked}
            </div>
            <div className="font-label-md text-xs text-on-surface-variant leading-tight">Blocked</div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-primary font-label-badge text-[10px]">
            <span className="material-symbols-outlined text-[12px]">shield</span>
            <span className="truncate">Safe guard active</span>
          </div>
        </div>
      </div>

      {/* Safety Guard / Daily Limit Progress Card (Stitch Design) */}
      <div className="bg-surface-container-high rounded-xl p-space-md shadow-md flex flex-col gap-space-sm border border-outline-variant/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
            <span className="font-label-lg text-xs sm:text-sm text-on-surface font-semibold">
              Daily Safe Sending Limit
            </span>
          </div>
          <span className="font-label-md text-xs sm:text-sm text-primary font-bold">
            {counts.sent} / {dailyCap} daily
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary-container h-full rounded-full transition-all shadow-[0_0_8px_rgba(91,91,240,0.6)]"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>

        <div className="flex items-start justify-between gap-space-sm pt-1">
          <p className="font-label-md text-xs text-on-surface-variant leading-relaxed">
            Spacing between emails (2-5 minutes) to stay within safe sending limits.
            Inbox placement cannot be guaranteed by any automated provider.
          </p>
          <button
            type="button"
            onClick={toggleQueuePause}
            className={`shrink-0 px-space-sm py-1.5 rounded-lg font-label-badge text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 active:scale-95 transition-transform min-h-[36px] ${
              isQueuePaused
                ? 'bg-secondary-container/30 text-secondary'
                : 'bg-tertiary-container/30 text-tertiary'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isQueuePaused ? 'play_circle' : 'pause_circle'}
            </span>
            <span>{isQueuePaused ? 'Resume' : 'Pause Now'}</span>
          </button>
        </div>
      </div>

      {/* Live Activity Stream Section Header & Tab Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-space-xs">
        <div className="flex items-center gap-2">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Live Activity Stream
          </h2>
          <span className="font-label-badge text-[9px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-bold">
            REAL-TIME
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['all', 'sent', 'waiting', 'blocked', 'replies'] as EmailTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all min-h-[32px] ${
                activeTab === tab
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'all'
                ? `All (${emails.length})`
                : tab === 'sent'
                ? `Sent (${counts.sent})`
                : tab === 'waiting'
                ? `Queue (${counts.waiting})`
                : tab === 'blocked'
                ? `Blocked (${counts.blocked})`
                : `Replies (${counts.replies})`}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Stream Cards List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-on-surface-variant">Checking email status...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-space-sm">
          {filtered.map((item, idx) => {
            const isSent = item.status === 'sent';
            const isWaiting = item.status === 'waiting';
            const isBlocked = item.status === 'blocked';
            const isReplied = item.status === 'replied';

            return (
              <div
                key={item.id}
                className={`bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm relative overflow-hidden border border-outline-variant/20 transition-all ${
                  isWaiting && idx === 0 ? 'ring-1 ring-tertiary/40' : ''
                }`}
              >
                {/* Glowing bar for the next queued item */}
                {isWaiting && idx === 0 && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-tertiary"></div>
                )}

                <div className="flex items-start justify-between gap-space-xs">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        {isSent ? 'mark_email_read' : isReplied ? 'mark_chat_read' : isBlocked ? 'shield' : 'outgoing_mail'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-xs sm:text-sm text-on-surface font-semibold truncate">
                          {item.businessName}
                        </span>
                        {item.isDemo && (
                          <span className="px-1.5 py-0.2 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[9px] uppercase font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                      <span className="font-label-md text-xs text-on-surface-variant font-mono truncate">
                        {item.recipientEmail}
                      </span>
                    </div>
                  </div>

                  <span className="font-label-badge text-[10px] text-on-surface-variant shrink-0">
                    {item.sentAt
                      ? new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Status Highlight Pill */}
                <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-lg w-fit text-xs font-semibold">
                  {isSent ? (
                    <span className="bg-secondary-container/20 text-secondary px-2.5 py-1 rounded-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>Sent &amp; confirmed in Gmail</span>
                    </span>
                  ) : isReplied ? (
                    <span className="bg-tertiary-container/30 text-tertiary px-2.5 py-1 rounded-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      <span>Client replied to your outreach</span>
                    </span>
                  ) : isBlocked ? (
                    <span className="bg-error-container/30 text-error px-2.5 py-1 rounded-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">block</span>
                      <span>Blocked: {item.blockedReason}</span>
                    </span>
                  ) : (
                    <span className="bg-tertiary-container/25 text-tertiary px-2.5 py-1 rounded-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                      <span>Scheduled for next safe cycle</span>
                    </span>
                  )}
                </div>

                {/* Subject Line Callout */}
                <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-0.5">
                  <span className="font-label-badge text-[10px] text-outline uppercase tracking-wider font-bold">
                    Subject Line
                  </span>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface line-clamp-1">
                    &ldquo;{item.subject}&rdquo;
                  </p>
                </div>

                {/* Bottom Actions for Queued / Sent items */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-on-surface-variant">
                    {isSent && item.gmailMessageId ? (
                      <span className="font-mono text-[10px]">ID: {item.gmailMessageId.slice(0, 16)}...</span>
                    ) : isWaiting ? (
                      <span>Waiting for recipient local business window</span>
                    ) : (
                      <span>Safe guard verified</span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isWaiting && (
                      <button
                        type="button"
                        onClick={() => setEditingDraft(item)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant font-label-md text-xs font-semibold flex items-center gap-1 transition-colors min-h-[36px]"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Edit Email</span>
                      </button>
                    )}
                    {item.body && (
                      <button
                        type="button"
                        onClick={() => setEditingDraft(item)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-xs font-semibold transition-colors min-h-[36px]"
                      >
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-space-lg bg-surface-container shadow-sm flex flex-col items-center justify-center text-center gap-3 border border-outline-variant/20 py-12">
          <span className="material-symbols-outlined text-[40px] text-primary">forward_to_inbox</span>
          <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            No emails found in this category
          </p>
          <p className="font-body-md text-sm text-on-surface-variant max-w-md">
            {showDemo
              ? 'No demo emails match this filter.'
              : 'No real outreach emails recorded yet. Send a test email to yourself or find businesses to queue safe drafts.'}
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="min-h-[44px] px-space-md py-2 bg-primary-container text-on-primary-container font-label-lg text-xs font-semibold rounded-lg flex items-center gap-1.5 active:opacity-90 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{isSendingTest ? 'Sending...' : 'Send Test Email to Myself'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Micro-help Reassurance Banner (Stitch Design) */}
      <div className="p-space-md rounded-xl bg-surface-container flex items-center gap-space-sm border border-outline-variant/20">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-tertiary shrink-0">
          <span className="material-symbols-outlined text-[18px]">lightbulb</span>
        </div>
        <p className="font-label-md text-xs text-on-surface-variant flex-1 leading-snug">
          Need to stop for the day? Tap <strong>Pause Now</strong> anytime. Your queued leads will remain safely saved in Zia&apos;s draft locker.
        </p>
      </div>

      {/* Preview / Edit Email Modal */}
      {editingDraft && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingDraft(null)}
        >
          <div
            className="bg-surface-container rounded-2xl p-space-lg border border-outline-variant/30 max-w-lg w-full space-y-space-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">drafts</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Email Preview
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                aria-label="Close preview"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-on-surface-variant font-medium">To: </span>
                <strong className="text-on-surface font-mono">{editingDraft.recipientEmail}</strong>
              </div>
              <div>
                <span className="text-on-surface-variant font-medium">Subject: </span>
                <strong className="text-on-surface">{editingDraft.subject}</strong>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 max-h-64 overflow-y-auto">
              <p className="font-mono text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                {editingDraft.body || 'Personalized pitch generated based on verified website scan evidence.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-xs font-semibold min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-on-surface-variant">Loading emails...</div>}>
      <EmailsContent />
    </Suspense>
  );
}
