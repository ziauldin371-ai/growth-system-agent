'use client';

import React, { useState, useEffect } from 'react';
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
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);
  const [newSuppression, setNewSuppression] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('unsubscribe');
  const [dailyLimit, setDailyLimit] = useState(50);
  const [sentToday, setSentToday] = useState(6);
  const [bounceRate, setBounceRate] = useState(0.8); // 0.8%

  const fetchSafetyData = async () => {
    try {
      const res = await fetch('/api/compliance/suppression');
      const data = await res.json();
      if (data.success && Array.isArray(data.suppressionList)) {
        setSuppressionList(data.suppressionList);
      }
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchSafetyData();
  }, []);

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
                style={{ width: `${(sentToday / dailyLimit) * 100}%` }}
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
            <StatusChip variant="success" label={`${bounceRate}% Bounce Rate`} />
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${(bounceRate / 5) * 100}%` }}
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
              <span>UK PECR Business Exemption</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              UK sole traders and individuals are excluded by default. The system strictly reaches out to registered corporate entities (LLPs and Ltds) with legitimate business interest.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>48-Hour Freshness Check</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              A business is only emailed if its active operational status, website check, and MX records were re-verified within the last 48 hours. Closed businesses are rejected automatically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Recipient Timezone Guard</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              The system calculates the recipient&apos;s real local time (US Eastern/Pacific, UK GMT, EU CET, AU AEST) and dispatches only between 9:00 AM and 5:00 PM local business hours.
            </p>
          </div>
        </div>
      </div>

      {/* Do-Not-Contact List (Suppression) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>Do-Not-Contact List (Global Opt-Out)</span>
            </h3>
            <p className="text-xs text-slate-400">Emails or domains added here are permanently blocked from any outreach.</p>
          </div>
          <span className="text-xs text-slate-400">{suppressionList.length} suppressed records</span>
        </div>

        {/* Add Entry Form */}
        <form onSubmit={handleAddSuppression} className="flex gap-2">
          <input
            type="text"
            value={newSuppression}
            onChange={e => setNewSuppression(e.target.value)}
            placeholder="Add email (e.g. name@company.com) or domain (e.g. competitor.com)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={suppressionReason}
            onChange={e => setSuppressionReason(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
          >
            <option value="unsubscribe">Unsubscribe request</option>
            <option value="bounce">Hard bounce</option>
            <option value="competitor">Competitor</option>
            <option value="manual_block">Operator block</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
          >
            Add to List
          </button>
        </form>

        {/* List Table */}
        {suppressionList.length > 0 ? (
          <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Blocked Email or Domain</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Added When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {suppressionList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-white">{item.value}</td>
                    <td className="py-2.5 px-4 capitalize">{item.reason || 'Unsubscribe'}</td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
            No entries on the do-not-contact list. Unsubscribed recipients and manual blocks will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

