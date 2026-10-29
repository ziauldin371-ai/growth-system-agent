'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, CheckCircle2, UserX, AlertTriangle, FileText, RefreshCw } from 'lucide-react';

export default function ComplianceCenterPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<'email' | 'domain' | 'company'>('email');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState<string>('manual_dnc');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadSuppression = () => {
    setLoading(true);
    fetch('/api/compliance/suppression')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setList(data.suppressionList);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSuppression();
  }, []);

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/compliance/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value, reason, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setValue('');
        setNotes('');
        setMessage(`Added ${value} to suppression list`);
        loadSuppression();
      }
    } catch (err: any) {
      alert(`Failed to add: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compliance & Suppression Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enforces CAN-SPAM, UK PECR, and GDPR statutory boundaries. Prevents outreach to opted-out or restricted entities.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Suppression Entry</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Statutory Rules Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            CAN-SPAM Act (US)
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All messages contain clear sender identification, accurate subject headers, valid physical postal office address, and one-click opt-out links.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-cyan-400" />
            UK PECR & Data Protection
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            B2B corporate outreach is permitted to corporate entities when directly relevant to commercial activities. Direct personal web scraping is blocked.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <UserX className="w-4 h-4 text-rose-400" />
            Zero-Tolerance Suppression
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Unsubscribes, hard bounces, and manual DNC entries are synchronized immediately. Bounced or opted-out leads can never receive future sends.
          </p>
        </div>
      </div>

      {/* Suppression Records Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300">
            Active Suppression Records ({list.length})
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-6">Entry Value</th>
                <th className="py-3 px-6">Type</th>
                <th className="py-3 px-6">Reason</th>
                <th className="py-3 px-6">Notes / Context</th>
                <th className="py-3 px-6 text-right">Added At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-medium text-white">{item.value}</td>
                  <td className="py-3.5 px-6 uppercase text-[10px] font-bold text-slate-400">{item.type}</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      {item.reason}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-400">{item.notes || '—'}</td>
                  <td className="py-3.5 px-6 text-right text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Suppression Entry</h3>
            <form onSubmit={handleAddSuppression} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Type</label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="email">Specific Email Address</option>
                  <option value="domain">Entire Domain (@company.com)</option>
                  <option value="company">Company Name</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Value</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. competitor.com or user@domain.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="manual_dnc">Manual Do-Not-Contact (DNC)</option>
                  <option value="unsubscribe">Recipient Unsubscribe Request</option>
                  <option value="hard_bounce">Hard Bounce / Invalid Mailbox</option>
                  <option value="complaint">Spam Complaint / Flag</option>
                  <option value="competitor">Competitor Exclusion</option>
                  <option value="legal_risk">Legal / Compliance Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Context / Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Requested removal via phone or email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
                >
                  Add to Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
