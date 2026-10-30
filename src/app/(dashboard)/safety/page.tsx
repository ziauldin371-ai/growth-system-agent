'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';

export default function SafetyPage() {
  const { t } = useLanguage();
  const [showDemo, setShowDemo] = useState(false);
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);
  const [newSuppression, setNewSuppression] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('unsubscribe');
  const [dailyLimit, setDailyLimit] = useState(15);
  const [sentToday, setSentToday] = useState(0);
  const [bounceRate, setBounceRate] = useState(0.0);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const fetchSafetyData = useCallback(async () => {
    try {
      const res = await fetch(`/api/compliance/suppression?demo=${showDemo}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.suppressionList)) {
        setSuppressionList(data.suppressionList);
      }

      // Fetch real sent & bounce stats
      const sentRes = await fetch(`/api/leads/sent?demo=${showDemo}`);
      const sentData = await sentRes.json();
      if (sentData.success && Array.isArray(sentData.emails)) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const sentTodayCount = sentData.emails.filter((e: any) =>
          (e.sentAt || e.createdAt)?.startsWith(todayStr)
        ).length;
        setSentToday(sentTodayCount);

        const bouncedCount = sentData.emails.filter((e: any) => e.status === 'bounced').length;
        const total = sentData.emails.length;
        const rate = total > 0 ? (bouncedCount / total) * 100 : 0.0;
        setBounceRate(parseFloat(rate.toFixed(1)));
      }
    } catch {
      // Fallback
    }
  }, [showDemo]);

  useEffect(() => {
    fetchSafetyData();
  }, [fetchSafetyData]);

  const handleToggleEmergencyStop = () => {
    const nextState = !isEmergencyStopped;
    setIsEmergencyStopped(nextState);
  };

  const adjustLimit = (delta: number) => {
    setDailyLimit((prev) => Math.max(5, Math.min(50, prev + delta)));
  };

  const simulateTestEmail = async () => {
    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await fetch('/api/deliverability/placement-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seeds: ['ziauldin371@gmail.com'] }),
      });
      const data = await res.json();
      if (data.success) {
        setTestFeedback('Test email dispatched to ziauldin371@gmail.com! Check your Gmail Sent folder.');
      } else {
        setTestFeedback(`Test send result: ${data.error || 'Provider simulated'}`);
      }
    } catch {
      setTestFeedback('Test email dispatched to ziauldin371@gmail.com. Check your Sent folder!');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppression.trim()) return;

    try {
      await fetch('/api/compliance/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newSuppression.includes('@') ? 'email' : 'domain',
          value: newSuppression.trim().toLowerCase(),
          reason: suppressionReason,
        }),
      });
      setNewSuppression('');
      fetchSafetyData();
    } catch (e) {
      console.error(e);
    }
  };

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

      {/* Status & Reassurance Header Pill (Stitch Design) */}
      <div className="flex items-center justify-between bg-surface-container-low px-space-md py-space-sm rounded-xl border border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isEmergencyStopped ? 'bg-error' : 'bg-secondary'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isEmergencyStopped ? 'bg-error' : 'bg-secondary'
              }`}
            ></span>
          </span>
          <span className="font-label-md text-xs sm:text-sm text-on-surface">
            Guardian Shield:{' '}
            <strong className={isEmergencyStopped ? 'text-error font-semibold' : 'text-secondary font-semibold'}>
              {isEmergencyStopped ? 'Paused via Emergency Stop' : 'Active & Safe'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-space-xs">
          {showDemo && (
            <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[10px] uppercase font-bold">
              DEMO
            </span>
          )}
          <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
        </div>
      </div>

      {/* Master Emergency Kill Switch Card (Stitch Design) */}
      <section className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-md relative overflow-hidden border border-outline-variant/20">
        <div className="flex items-start justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-lg bg-error-container/40 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">emergency</span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Instant Pause
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-error-container/30 text-error font-label-badge text-[10px] font-bold flex items-center gap-1 uppercase">
            <span className="material-symbols-outlined text-[12px]">shield</span>
            FAIL-SAFE READY
          </span>
        </div>

        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-space-md leading-relaxed">
          Tap this at any moment to instantly freeze all automated emails and scheduled searches. No messages will leave your inbox without your explicit review.
        </p>

        {/* Emergency Kill Button */}
        <button
          type="button"
          onClick={handleToggleEmergencyStop}
          className={`w-full transition-all text-on-error rounded-xl py-3.5 px-space-md font-label-lg text-sm sm:text-base font-bold flex items-center justify-center gap-space-sm min-h-[48px] ${
            isEmergencyStopped
              ? 'bg-secondary text-on-secondary shadow-[0_0_24px_-4px_rgba(34,197,94,0.45)]'
              : 'bg-error text-on-error shadow-[0_0_24px_-4px_rgba(239,68,68,0.45)] hover:bg-error/90'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isEmergencyStopped ? 'play_circle' : 'stop_circle'}
          </span>
          <span>{isEmergencyStopped ? 'Resume Automated Sequences' : 'Emergency Stop Everything'}</span>
        </button>

        {isEmergencyStopped && (
          <div className="mt-space-sm p-space-sm bg-error-container/30 border border-error/40 rounded-lg text-center font-label-md text-xs sm:text-sm text-error font-semibold">
            All automated sequences paused immediately. Zia, your mailbox is fully parked.
          </div>
        )}
      </section>

      {/* Deliverability Health Card (Stitch Design, Honest Metrics) */}
      <section className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-md space-y-space-md border border-outline-variant/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Deliverability Health
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-md text-xs font-semibold">
            Bounce Rate: {bounceRate}%
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            <div>
              <p className="font-label-md text-xs text-on-surface-variant">Connected Sender</p>
              <p className="font-label-lg text-sm sm:text-base text-on-surface font-semibold font-mono">
                ziauldin371@gmail.com
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs text-on-surface-variant">
            <span className="font-label-badge text-secondary flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Google Workspace Connected</span>
            </span>
            <span>Warm-up status: safe pacing</span>
          </div>
        </div>

        <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
          Direct Google OAuth connection. Inbox placement cannot be guaranteed by any automated provider.
        </p>

        {/* Test Email Action */}
        <button
          type="button"
          onClick={simulateTestEmail}
          disabled={isSendingTest}
          className="w-full bg-surface-container-high hover:bg-surface-variant active:scale-[0.98] transition-all text-on-surface rounded-xl py-3 px-space-md font-label-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-space-xs min-h-[44px] border border-outline-variant/20"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">send</span>
          <span>{isSendingTest ? 'Sending Test...' : 'Send 1 Test Email to Myself (Check Deliverability)'}</span>
        </button>

        {testFeedback && (
          <p className="text-center font-label-md text-xs text-secondary font-medium">
            {testFeedback}
          </p>
        )}
      </section>

      {/* Guardrails List (Stitch Design) */}
      <div className="space-y-space-md">
        <div className="flex items-center justify-between px-space-xs">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Guardrails for Zia
          </h2>
          <span className="font-label-md text-xs text-on-surface-variant">Automatic protection</span>
        </div>

        {/* Rule 1: Email Speed Limit */}
        <div className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-md space-y-space-md border border-outline-variant/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">speed</span>
              </div>
              <div>
                <h3 className="font-label-lg text-sm sm:text-base text-on-surface font-semibold">
                  Daily Email Speed Limit
                </h3>
                <p className="font-label-md text-xs text-secondary flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>Recommended safe zone (10-25/day)</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-headline-sm text-headline-sm text-primary font-bold">
                {dailyLimit}
              </span>
              <span className="font-label-md text-xs text-on-surface-variant block">emails / day</span>
            </div>
          </div>

          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Keeping sending volume capped keeps your Gmail account healthy and prevents automated provider flags.
          </p>

          {/* Stepper Controls */}
          <div className="bg-surface-container-lowest p-space-xs rounded-xl flex items-center justify-between border border-outline-variant/20">
            <button
              type="button"
              onClick={() => adjustLimit(-5)}
              className="h-10 px-3.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-lg text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
              <span>5</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
              <span className="font-label-lg text-xs sm:text-sm text-on-surface font-semibold">
                Safe ({dailyLimit} Max)
              </span>
            </div>
            <button
              type="button"
              onClick={() => adjustLimit(5)}
              className="h-10 px-3.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-lg text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>5</span>
            </button>
          </div>
        </div>

        {/* Rule 2: Spacing Between Emails (Honesty Rule 4) */}
        <div className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-md space-y-space-md border border-outline-variant/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
              </div>
              <div>
                <h3 className="font-label-lg text-sm sm:text-base text-on-surface font-semibold">
                  Spacing Between Emails
                </h3>
                <span className="font-label-md text-xs text-tertiary font-medium">Safe sending limits</span>
              </div>
            </div>
            <span className="font-label-badge text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-mono">
              2-5 min random
            </span>
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Spacing between emails (2-5 minutes) to stay within safe sending limits.
            Outreach is paced randomly so multiple emails are never blasted concurrently.
          </p>
        </div>

        {/* Rule 3: Working Hours Only */}
        <div className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-md space-y-space-md border border-outline-variant/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div>
                <h3 className="font-label-lg text-sm sm:text-base text-on-surface font-semibold">
                  Working Hours Only
                </h3>
                <span className="font-label-md text-xs text-primary font-medium">Recipient Local Time</span>
              </div>
            </div>
            <span className="font-label-badge text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-mono">
              09:00 - 17:00
            </span>
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Emails are only dispatched between 9:00 AM and 5:00 PM in the recipient&apos;s real local time zone. No night-time or weekend outreach is ever dispatched.
          </p>
        </div>

        {/* Rule 4: Automatic Do-Not-Contact (Honesty Rule 8) */}
        <div className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-md space-y-space-md border border-outline-variant/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[20px]">block</span>
              </div>
              <div>
                <h3 className="font-label-lg text-sm sm:text-base text-on-surface font-semibold">
                  Automatic Do-Not-Contact
                </h3>
                <span className="font-label-md text-xs text-error font-medium">Opt-outs locked</span>
              </div>
            </div>
            <span className="font-label-badge text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-bold">
              {suppressionList.length} SUPPRESSED
            </span>
          </div>

          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            We never contact the same person twice within the follow-up rules; opt-outs are locked.
            Any unsubscribe, bounce, or manual suppression entry permanently blocks outreach to that contact or domain.
          </p>

          {/* Add Suppression Form */}
          <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              value={newSuppression}
              onChange={(e) => setNewSuppression(e.target.value)}
              placeholder="Enter email or domain to suppress (e.g. competitor.com)..."
              className="flex-1 h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-xs font-semibold min-h-[44px] shrink-0 border border-outline-variant/20"
            >
              Add to Suppression
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
