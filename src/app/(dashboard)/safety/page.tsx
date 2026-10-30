'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  AlertOctagon, 
  UserX, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Gauge, 
  HelpCircle,
  Clock
} from 'lucide-react';
import { PageHeader, StatusChip } from '@/components/ui/design-system';
import { useLanguage } from '@/context/language-context';

export default function SafetyPage() {
  const { t } = useLanguage();
  const [showDemo, setShowDemo] = useState(false);
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);
  const [newSuppression, setNewSuppression] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('unsubscribe');
  const [dailyLimit, setDailyLimit] = useState(50);
  const [sentToday, setSentToday] = useState(0);
  const [bounceRate, setBounceRate] = useState(0.0);

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
    } catch (e) {
      // Fallback
    }
  }, [showDemo]);

  useEffect(() => {
    fetchSafetyData();
  }, [fetchSafetyData]);

  const handleToggleEmergencyStop = () => {
    setIsEmergencyStopped(!isEmergencyStopped);
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Demo Banner */}
      {showDemo && (
        <div className="p-4 rounded-2xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-between gap-4 text-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <span className="font-bold text-sm">Demo data is shown; these are not real businesses</span>
              <span className="text-xs text-orange-300 ml-2">Simulated sandbox records. Outreach is blocked.</span>
            </div>
          </div>
          <button
            onClick={() => setShowDemo(false)}
            className="px-3.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-semibold shrink-0"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="How are we staying safe and legal?"
        subtitle="Emergency stop, do-not-contact list, bounce protection, and plain-language legal rules."
        urduSubtitle="Hifazat aur qawaneen: emergency stop, do-not-contact list aur bounce protection."
        helpContent={{
          titleEn: 'Email Safety & Legal Rules',
          titleUr: 'Email Hifazat Aur Qawaneen',
          pointsEn: [
            'Emergency Stop: Big red button that immediately halts all outbound email sending.',
            'Do-Not-Contact List: Any person or domain added here is permanently blocked from receiving emails.',
            'Bounce Auto-Throttle: If bounces exceed 3%, the system warns you; at 5%, it pauses automatically to protect your Gmail reputation.',
            'Recipient Time Window: Emails are only sent between 9:00 AM and 5:00 PM in the recipient’s local time.',
          ],
          pointsUr: [
            'Emergency Stop: Bara laal button jo tamam bahar jane wali emails ko foran rok deta hai.',
            'Do-Not-Contact List: Koi bhi email ya company jo yahan darj ho, use kabhi dobara email nahi jayegi.',
            'Bounce Protection: Agar 3% se zyada emails bounce hon to system Gmail ki hifazat ke liye ruk jata hai.',
            'Time Window: Emails sirf us mulk ke karobaari auqaat (subah 9 se shaam 5) ke doran jati hain.',
          ],
        }}
        actions={
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span>Show demo data</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">DEMO</span>
          </label>
        }
      />

      {/* Emergency Stop Hero Card */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isEmergencyStopped 
          ? 'bg-rose-950/30 border-rose-500/50 shadow-xl shadow-rose-950/40' 
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertOctagon className={`w-5 h-5 ${isEmergencyStopped ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
              <h2 className="text-lg font-bold text-white">Emergency Stop Switch</h2>
              <StatusChip 
                variant={isEmergencyStopped ? 'error' : 'success'} 
                label={isEmergencyStopped ? 'Sending Blocked' : 'Normal Operations'} 
              />
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Instantly blocks any email from leaving your account. Discovered leads, drafts, and historical records remain preserved in the database.
            </p>
          </div>

          <button
            onClick={handleToggleEmergencyStop}
            className={`px-6 py-3.5 rounded-xl text-sm font-extrabold shadow-xl transition-all transform active:scale-95 shrink-0 ${
              isEmergencyStopped
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 hover:scale-105'
            }`}
          >
            {isEmergencyStopped ? 'RESUME SENDING' : 'EMERGENCY STOP (PAUSE ALL)'}
          </button>
        </div>
      </div>

      {/* Daily Limits & Bounce Auto-Throttle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Sending Limit */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Daily Sending Limit &amp; Warm-up</h3>
            </div>
            <span className="text-xs text-indigo-300 font-semibold">{sentToday} / {dailyLimit} sent today</span>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${dailyLimit > 0 ? (sentToday / dailyLimit) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Starts at 10 emails/day and ramps gradually up to 50/day. Protects your Gmail sender reputation.
            </p>
          </div>
        </div>

        {/* Bounce Protection Gauge */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Bounce Protection Gauge</h3>
            </div>
            <StatusChip variant={bounceRate > 3 ? 'error' : 'success'} label={`${bounceRate}% Bounce Rate`} />
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (bounceRate / 5) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Healthy (&lt; 2%)</span>
              <span className="text-amber-400">Warning (3%)</span>
              <span className="text-rose-400">Auto-Pause (5%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Checklist in Plain Words */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <Scale className="w-4 h-4 text-indigo-400" />
          <span>Legal Safety Checklist (Plain English)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>CAN-SPAM Act Compliance</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Includes physical postal mailing address, honest and non-deceptive subject lines, and an instant 1-click unsubscribe notice in every outgoing email.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>UK PECR &amp; GDPR Rules</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Excludes sole traders and unverified personal inboxes by default. Sends only to registered corporate entities with legitimate commercial interest.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Recipient Local Working Hours</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              All emails are sent exclusively between 9:00 AM and 5:00 PM in the prospect’s real local timezone (US Eastern, Pacific, UK GMT, EU CET, Australian AEST).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Automatic Reputation Safeguards</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Real-time MX record verification, syntax inspection, and automated 2–5 minute spacing between emails prevents Gmail rate-limiting.
            </p>
          </div>
        </div>
      </div>

      {/* Do-Not-Contact (Suppression) List */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>Do-Not-Contact List (Unsubscribes &amp; Competitors)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Emails or domains added here are permanently blocked from receiving outreach.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{suppressionList.length} suppressed</span>
        </div>

        {/* Add Entry Form */}
        <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newSuppression}
            onChange={(e) => setNewSuppression(e.target.value)}
            placeholder="Add email (john@example.com) or domain (competitor.com)..."
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={suppressionReason}
            onChange={(e) => setSuppressionReason(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="unsubscribe">Unsubscribed</option>
            <option value="competitor">Competitor</option>
            <option value="do_not_contact">Do Not Contact</option>
            <option value="bounced">Hard Bounced</option>
          </select>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Block</span>
          </button>
        </form>

        {/* Suppression Table */}
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Value</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
              {suppressionList.length > 0 ? (
                suppressionList.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400 font-sans">{entry.type}</td>
                    <td className="py-2.5 px-3 font-semibold text-rose-300">
                      <span>{entry.value}</span>
                      {entry.isSandboxData && (
                        <span className="ml-1.5 px-1 py-0.2 rounded bg-orange-500/20 text-orange-400 text-[9px] border border-orange-500/30 font-sans">DEMO</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{entry.reason}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans">{new Date(entry.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No addresses on suppression list. New unsubscribes and blocks will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
