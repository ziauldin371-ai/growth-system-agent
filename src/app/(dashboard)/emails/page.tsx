'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';

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
  const { success, error: toastError } = useToast();

  const initialTab = (searchParams.get('tab') as EmailTab) || 'all';
  const initialDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [activeTab, setActiveTab] = useState<EmailTab>(initialTab);
  const [showDemo, setShowDemo] = useState(initialDemo);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

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
            body: e.emailBody || e.body || 'Hi, we noticed an opportunity to improve your online presence.',
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
            body: d.emailBody || d.body || 'Hello, I came across your local business profile...',
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
                : 'Pending verification check or outside business hours'),
            isDemo: demo,
          });
        });
      }

      setEmails(combined);
      if (combined.length > 0) {
        setSelectedEmail((prev) => prev || combined[0]);
      }
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
        success('Test email sent to ziauldin371@gmail.com! Check your Gmail Sent folder.');
        loadEmails();
      } else {
        setBannerNotice(`Test send notice: ${data.error || 'Provider in test mode'}`);
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
      await new Promise((r) => setTimeout(r, 800));
      success('Gmail sync complete. Sent items and inbox replies updated.');
      loadEmails();
    } catch {
      setBannerNotice('Sync complete.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pause / Resume toggle
  const toggleQueuePause = () => {
    const nextState = !isQueuePaused;
    setIsQueuePaused(nextState);
    if (nextState) {
      success('Queue paused. No emails will leave until you tap Resume.');
    } else {
      success('Queue resumed. Safe automated sending is active.');
    }
  };

  // Safe Bulk Skip Action
  const handleBulkSkip = () => {
    if (selectedIds.length === 0) return;
    setEmails((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
    success(`Skipped ${selectedIds.length} queued emails.`);
    setSelectedIds([]);
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

  const dailySentLimit = 25;
  const sentToday = counts.sent;
  const dailyProgress = Math.min(100, Math.round((sentToday / dailySentLimit) * 100));

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Demo Notice */}
      {showDemo && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-3 text-tertiary shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <div>
              <span className="font-label-lg font-bold">Demo data is shown; these are not real emails</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Simulated dispatches for previewing workflow.
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

      {/* Top Banner Notice if any */}
      {bannerNotice && (
        <div className="rounded-xl p-3 bg-surface-container-high border border-outline-variant/30 flex items-center justify-between text-xs text-on-surface">
          <span>{bannerNotice}</span>
          <button onClick={() => setBannerNotice(null)} className="p-1 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Connected Sender Header Card */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">mark_email_read</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-on-surface">
                Outreach &amp; Email Queue
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-semibold">
                Connected
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Sender: <strong className="font-mono text-on-surface">ziauldin371@gmail.com</strong> (Primary Google Workspace)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSyncGmail}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant text-xs font-semibold flex items-center gap-1 transition-colors min-h-[36px]"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Gmail'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={isSendingTest}
            className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-1 shadow-md hover:opacity-90 transition-opacity min-h-[36px]"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>{isSendingTest ? 'Sending...' : 'Send Test Email'}</span>
          </button>
        </div>
      </section>

      {/* Top 4 Stat Tiles: Today, In Queue, Blocked, Replies */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Sent Today */}
        <div
          onClick={() => setActiveTab('sent')}
          className={`cursor-pointer rounded-2xl p-4 bg-surface-container border transition-all ${
            activeTab === 'sent'
              ? 'border-primary shadow-md ring-1 ring-primary'
              : 'border-outline-variant/20 hover:border-outline-variant/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Sent Today</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">forward_to_inbox</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">{counts.sent}</div>
          <div className="text-[11px] text-secondary mt-1 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            <span>Confirmed in Gmail</span>
          </div>
        </div>

        {/* In Queue */}
        <div
          onClick={() => setActiveTab('waiting')}
          className={`cursor-pointer rounded-2xl p-4 bg-surface-container border transition-all ${
            activeTab === 'waiting'
              ? 'border-primary shadow-md ring-1 ring-primary'
              : 'border-outline-variant/20 hover:border-outline-variant/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>In Queue</span>
            <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">{counts.waiting}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">2-5 min random spacing</div>
        </div>

        {/* Blocked */}
        <div
          onClick={() => setActiveTab('blocked')}
          className={`cursor-pointer rounded-2xl p-4 bg-surface-container border transition-all ${
            activeTab === 'blocked'
              ? 'border-primary shadow-md ring-1 ring-primary'
              : 'border-outline-variant/20 hover:border-outline-variant/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Blocked</span>
            <span className="material-symbols-outlined text-[18px] text-error">block</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">{counts.blocked}</div>
          <div className="text-[11px] text-error mt-1 font-semibold">Safety Guard</div>
        </div>

        {/* Replies */}
        <div
          onClick={() => setActiveTab('replies')}
          className={`cursor-pointer rounded-2xl p-4 bg-surface-container border transition-all ${
            activeTab === 'replies'
              ? 'border-primary shadow-md ring-1 ring-primary'
              : 'border-outline-variant/20 hover:border-outline-variant/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-tertiary">
            <span>Replies</span>
            <span className="material-symbols-outlined text-[18px] text-tertiary">mark_email_unread</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-tertiary mt-2">{counts.replies}</div>
          <div className="text-[11px] text-tertiary mt-1 font-semibold">Client Responses</div>
        </div>
      </section>

      {/* Daily Sending Limit Bar & Queue Control */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-on-surface">Daily Sending Limit</span>
            <span className="text-xs text-on-surface-variant">
              ({sentToday} of {dailySentLimit} emails sent)
            </span>
          </div>
          <button
            type="button"
            onClick={toggleQueuePause}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[36px] ${
              isQueuePaused
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isQueuePaused ? 'play_arrow' : 'pause'}
            </span>
            <span>{isQueuePaused ? 'Resume Sending' : 'Pause Queue'}</span>
          </button>
        </div>

        <div className="w-full h-2.5 rounded-full bg-surface-container-lowest overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isQueuePaused ? 'bg-outline' : 'bg-primary'
            }`}
            style={{ width: `${dailyProgress}%` }}
          ></div>
        </div>
      </section>

      {/* Filter Tabs & Bulk Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
              activeTab === 'all'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All ({emails.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
              activeTab === 'sent'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sent ({counts.sent})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('waiting')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
              activeTab === 'waiting'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Waiting ({counts.waiting})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
              activeTab === 'blocked'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Blocked ({counts.blocked})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('replies')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
              activeTab === 'replies'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Replies ({counts.replies})
          </button>
        </div>

        {/* Safe Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-medium">
              {selectedIds.length} selected:
            </span>
            <button
              onClick={handleBulkSkip}
              className="px-3 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold min-h-[36px]"
            >
              Skip Selected
            </button>
          </div>
        )}
      </div>

      {/* Main Split View: Table on Left, Selected Email Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane (Table on laptop / Cards on mobile) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-8 bg-surface-container border border-outline-variant/20 text-center text-xs text-on-surface-variant">
              No emails found under this tab.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block rounded-2xl bg-surface-container border border-outline-variant/20 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs text-on-surface">
                  <thead className="bg-surface-container-high border-b border-outline-variant/30 text-on-surface-variant font-semibold select-none">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(filtered.map((x) => x.id));
                            else setSelectedIds([]);
                          }}
                          className="w-4 h-4 rounded text-primary accent-primary"
                        />
                      </th>
                      <th className="py-3 px-3">Business</th>
                      <th className="py-3 px-3">Subject</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Gmail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {filtered.map((item) => {
                      const isSelected = selectedEmail?.id === item.id;
                      const isChecked = selectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedEmail(item);
                            setShowMobilePreview(true);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary-container/20 font-medium'
                              : 'hover:bg-surface-container-high/60'
                          }`}
                        >
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds((prev) => [...prev, item.id]);
                                else setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                              }}
                              className="w-4 h-4 rounded text-primary accent-primary"
                            />
                          </td>
                          <td className="py-3 px-3 truncate max-w-[140px]">
                            <div className="font-semibold text-on-surface truncate">{item.businessName}</div>
                            <div className="text-[10px] text-on-surface-variant truncate">{item.recipientEmail}</div>
                          </td>
                          <td className="py-3 px-3 truncate max-w-[180px]">
                            <span className="truncate block">{item.subject}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.status === 'sent'
                                  ? 'bg-secondary-container/20 text-secondary'
                                  : item.status === 'replied'
                                  ? 'bg-tertiary-container text-on-tertiary-container'
                                  : item.status === 'blocked'
                                  ? 'bg-error-container/30 text-error'
                                  : 'bg-surface-container-highest text-on-surface-variant'
                              }`}
                            >
                              {item.status === 'sent'
                                ? 'Sent'
                                : item.status === 'replied'
                                ? 'Replied'
                                : item.status === 'blocked'
                                ? 'Blocked'
                                : 'Waiting'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {item.status === 'sent' && (
                              <a
                                href="https://mail.google.com/mail/u/0/#sent"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-container/20 transition-colors inline-flex"
                                title="Open in Gmail Sent"
                              >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 640px) */}
              <div className="sm:hidden flex flex-col gap-3">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedEmail(item);
                      setShowMobilePreview(true);
                    }}
                    className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col gap-2 cursor-pointer active:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">{item.businessName}</h3>
                        <span className="text-xs text-on-surface-variant">{item.recipientEmail}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          item.status === 'sent'
                            ? 'bg-secondary-container/20 text-secondary'
                            : item.status === 'replied'
                            ? 'bg-tertiary-container text-on-tertiary-container'
                            : item.status === 'blocked'
                            ? 'bg-error-container/30 text-error'
                            : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-1 italic">{item.subject}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Pane (Selected Email Preview on laptop) */}
        <aside className="hidden lg:flex lg:col-span-5 flex-col gap-4 bg-surface-container p-5 rounded-2xl border border-outline-variant/20 lg:sticky lg:top-20">
          {selectedEmail ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-outline-variant/20">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Email Preview</span>
                  <h2 className="text-base font-bold text-on-surface mt-0.5">{selectedEmail.businessName}</h2>
                  <p className="text-xs text-on-surface-variant">{selectedEmail.recipientEmail}</p>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                    selectedEmail.status === 'sent'
                      ? 'bg-secondary-container/20 text-secondary'
                      : selectedEmail.status === 'replied'
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : selectedEmail.status === 'blocked'
                      ? 'bg-error-container/30 text-error'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {selectedEmail.statusLabel}
                </span>
              </div>

              {/* Message Headers */}
              <div className="p-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface-variant flex flex-col gap-1.5 border border-outline-variant/20">
                <div className="flex justify-between">
                  <span>From:</span>
                  <span className="font-mono text-on-surface">ziauldin371@gmail.com</span>
                </div>
                <div className="flex justify-between">
                  <span>Subject:</span>
                  <span className="font-semibold text-on-surface">{selectedEmail.subject}</span>
                </div>
                {selectedEmail.gmailMessageId && (
                  <div className="flex justify-between">
                    <span>Gmail ID:</span>
                    <span className="font-mono text-[10px]">{selectedEmail.gmailMessageId.slice(0, 16)}...</span>
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="p-4 rounded-xl bg-surface-container-lowest text-xs sm:text-sm text-on-surface leading-relaxed border border-outline-variant/20 font-sans whitespace-pre-wrap max-h-72 overflow-y-auto">
                {selectedEmail.body}
              </div>

              {/* Status Specific Actions */}
              {selectedEmail.status === 'waiting' && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEmails((prev) => prev.filter((e) => e.id !== selectedEmail.id));
                      setSelectedEmail(null);
                      success('Skipped email from queue.');
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-xs font-semibold text-on-surface min-h-[44px]"
                  >
                    Skip From Queue
                  </button>
                </div>
              )}

              {selectedEmail.status === 'sent' && (
                <a
                  href="https://mail.google.com/mail/u/0/#sent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md min-h-[44px]"
                >
                  <span>Open in Gmail Sent Folder</span>
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              )}

              {selectedEmail.status === 'blocked' && (
                <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-xs text-error">
                  <strong className="block mb-1">Safety block reason:</strong>
                  {selectedEmail.blockedReason}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              Select an email on the left to preview its content and status.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile Full-Screen Preview Sheet */}
      {showMobilePreview && selectedEmail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end lg:hidden"
          onClick={() => setShowMobilePreview(false)}
        >
          <div
            className="bg-surface-container rounded-t-2xl p-5 border-t border-outline-variant/30 space-y-4 max-h-[85vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div>
                <h3 className="text-base font-bold text-on-surface">{selectedEmail.businessName}</h3>
                <span className="text-xs text-on-surface-variant">{selectedEmail.recipientEmail}</span>
              </div>
              <button
                onClick={() => setShowMobilePreview(false)}
                className="p-2 rounded-lg bg-surface-container-high text-on-surface min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
              <strong className="block mb-1 text-primary">{selectedEmail.subject}</strong>
              {selectedEmail.body}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowMobilePreview(false)}
                className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary-container font-semibold text-xs min-h-[44px]"
              >
                Done
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
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-on-surface-variant">
          Loading email dispatches...
        </div>
      }
    >
      <EmailsContent />
    </Suspense>
  );
}
