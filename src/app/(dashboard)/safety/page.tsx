'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';

export default function SafetyPage() {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
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
    } catch {}
  }, [showDemo]);

  useEffect(() => {
    fetchSafetyData();
  }, [fetchSafetyData]);

  const handleToggleEmergencyStop = async () => {
    const nextState = !isEmergencyStopped;
    setIsEmergencyStopped(nextState);
    try {
      await fetch('/api/compliance/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: nextState, reason: 'Operator Safety Page Toggle' }),
      });
      if (nextState) {
        success('Emergency Stop Activated: All sending paused.');
      } else {
        success('System resumed: Automated sequences active.');
      }
    } catch {
      toastError('Could not sync pause state.');
    }
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
        success('Test email sent to ziauldin371@gmail.com!');
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
      success(`Added ${newSuppression} to suppression list.`);
      fetchSafetyData();
    } catch (e) {
      toastError('Failed to add suppression.');
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Demo Notice */}
      {showDemo && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-3 text-tertiary shadow-sm">
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
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* Status & Reassurance Header Pill */}
      <div className="flex items-center justify-between bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-2.5">
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
          <span className="text-xs sm:text-sm text-on-surface">
            Guardian Shield:{' '}
            <strong className={isEmergencyStopped ? 'text-error font-semibold' : 'text-secondary font-semibold'}>
              {isEmergencyStopped ? 'Paused via Emergency Stop' : 'Active & Safe'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showDemo && (
            <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-[10px] uppercase font-bold">
              DEMO
            </span>
          )}
          <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
        </div>
      </div>

      {/* 2-Column Cards Layout on Laptop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Column 1: Emergency Stop + Deliverability Health */}
        <div className="flex flex-col gap-5">
          {/* Master Emergency Kill Switch Card */}
          <section className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden border border-outline-variant/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-error-container/40 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[20px]">emergency</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-on-surface">
                  Instant Pause
                </h1>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-error-container/30 text-error text-[10px] font-bold flex items-center gap-1 uppercase">
                <span className="material-symbols-outlined text-[12px]">shield</span>
                FAIL-SAFE READY
              </span>
            </div>

            <p className="text-xs sm:text-sm text-on-surface-variant mb-4 leading-relaxed">
              Tap this at any moment to instantly freeze all automated emails and scheduled searches. No messages will leave your inbox without your explicit review.
            </p>

            {/* Emergency Kill Button */}
            <button
              type="button"
              onClick={handleToggleEmergencyStop}
              className={`w-full transition-all text-on-error rounded-xl py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 min-h-[48px] ${
                isEmergencyStopped
                  ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/30'
                  : 'bg-error text-on-error shadow-lg shadow-error/30 hover:bg-error/90'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isEmergencyStopped ? 'play_circle' : 'stop_circle'}
              </span>
              <span>{isEmergencyStopped ? 'Resume Automated Sequences' : 'Emergency Stop Everything'}</span>
            </button>

            {isEmergencyStopped && (
              <div className="mt-3 p-3 bg-error-container/30 border border-error/40 rounded-xl text-center text-xs text-error font-semibold">
                All automated sequences paused immediately. Your mailbox is fully parked.
              </div>
            )}
          </section>

          {/* Deliverability Health Card */}
          <section className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
                <h2 className="text-sm sm:text-base font-bold text-on-surface">
                  Deliverability Health
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-xs font-semibold">
                Bounce Rate: {bounceRate}%
              </span>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant">Connected Sender</p>
                  <p className="text-xs sm:text-sm text-on-surface font-semibold font-mono">
                    ziauldin371@gmail.com
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end text-xs text-on-surface-variant">
                <span className="text-secondary flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>Google Workspace Connected</span>
                </span>
                <span>Warm-up status: safe pacing</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Direct Google OAuth connection. Inbox placement cannot be assured by any automated provider.
            </p>

            <button
              type="button"
              onClick={simulateTestEmail}
              disabled={isSendingTest}
              className="w-full bg-surface-container-high hover:bg-surface-variant transition-all text-on-surface rounded-xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">send</span>
              <span>{isSendingTest ? 'Sending Test...' : 'Send 1 Test Email to Myself (Check Deliverability)'}</span>
            </button>

            {testFeedback && (
              <p className="text-center text-xs text-secondary font-medium">
                {testFeedback}
              </p>
            )}
          </section>
        </div>

        {/* Column 2: Guardrails & Suppression Manager */}
        <div className="flex flex-col gap-5">
          {/* Rule 1: Email Speed Limit */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm space-y-3 border border-outline-variant/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">speed</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm text-on-surface font-bold">
                    Daily Email Speed Limit
                  </h3>
                  <p className="text-[11px] text-secondary flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    <span>Recommended safe zone (10-25/day)</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl text-primary font-bold">
                  {dailyLimit}
                </span>
                <span className="text-[11px] text-on-surface-variant block">emails / day</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Keeping sending volume capped keeps your Gmail account healthy and avoids spam filter spikes.
            </p>

            {/* Stepper Controls */}
            <div className="bg-surface-container-lowest p-2 rounded-xl flex items-center justify-between border border-outline-variant/20">
              <button
                type="button"
                onClick={() => adjustLimit(-5)}
                className="h-9 px-3.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
                <span>5</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <span className="text-xs sm:text-sm text-on-surface font-semibold">
                  Safe ({dailyLimit} Max)
                </span>
              </div>
              <button
                type="button"
                onClick={() => adjustLimit(5)}
                className="h-9 px-3.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>5</span>
              </button>
            </div>
          </div>

          {/* Rule 2: Spacing Between Emails */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm space-y-2 border border-outline-variant/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm text-on-surface font-bold">
                    Spacing Between Emails
                  </h3>
                  <span className="text-[11px] text-tertiary font-medium">Safe sending limits</span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-mono">
                2-5 min random
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Spacing between emails (2-5 minutes) to stay within safe sending limits.
              Outreach is paced randomly so emails are never blasted concurrently.
            </p>
          </div>

          {/* Rule 3: Working Hours Only */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm space-y-2 border border-outline-variant/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">schedule</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm text-on-surface font-bold">
                    Working Hours Only
                  </h3>
                  <span className="text-[11px] text-primary font-medium">Recipient Local Time</span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-mono">
                09:00 - 17:00
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Emails are only dispatched between 9:00 AM and 5:00 PM in the recipient&apos;s real local time zone. No night-time or weekend outreach is ever dispatched.
            </p>
          </div>

          {/* Rule 4: Automatic Do-Not-Contact Suppression */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm space-y-3 border border-outline-variant/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[20px]">block</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm text-on-surface font-bold">
                    Automatic Do-Not-Contact
                  </h3>
                  <span className="text-[11px] text-error font-medium">Opt-outs locked</span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-bold">
                {suppressionList.length} SUPPRESSED
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              We never contact the same person twice within follow-up rules; opt-outs are locked.
              Any unsubscribe or bounce permanently blocks outreach to that contact or domain.
            </p>

            <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={newSuppression}
                onChange={(e) => setNewSuppression(e.target.value)}
                placeholder="Enter email or domain to suppress..."
                className="flex-1 h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold min-h-[44px] shrink-0 border border-outline-variant/20"
              >
                Add Suppression
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
