'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { VettedApplicationEntity, PlatformEntity } from '@/types';
import { useLanguage } from '@/context/language-context';

export function VettedApplicationsView() {
  const { t } = useLanguage();
  const [applications, setApplications] = useState<VettedApplicationEntity[]>([]);
  const [platforms, setPlatforms] = useState<PlatformEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<VettedApplicationEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsRes, platsRes] = await Promise.all([
        fetch('/api/platforms/applications'),
        fetch('/api/platforms?category=vetted_network,expert_network'),
      ]);
      const appsData = await appsRes.json();
      const platsData = await platsRes.json();
      setApplications(appsData.applications || []);
      setPlatforms(platsData.platforms || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateChecklist = async (appId: string, itemIndex: number, completed: boolean) => {
    const target = applications.find((a) => a.id === appId);
    if (!target) return;

    const newChecklist = target.checklist.map((item, idx) =>
      idx === itemIndex ? { ...item, completed } : item
    );

    const completedCount = newChecklist.filter((k) => k.completed).length;
    const readinessScore = Math.round((completedCount / (newChecklist.length || 1)) * 100);

    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, checklist: newChecklist, readinessScore } : a))
    );
    if (selectedApp?.id === appId) {
      setSelectedApp((prev) => (prev ? { ...prev, checklist: newChecklist, readinessScore } : null));
    }

    try {
      await fetch('/api/platforms/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appId,
          checklist: newChecklist,
          readinessScore,
        }),
      });
      showToast('Readiness updated');
    } catch {
      showToast('Failed to save update');
    }
  };

  const handleStatusChange = async (appId: string, newStatus: VettedApplicationEntity['status']) => {
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
    if (selectedApp?.id === appId) {
      setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await fetch('/api/platforms/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      showToast(`Status updated to ${newStatus}`);
    } catch {
      showToast('Failed to update status');
    }
  };

  const handleSavePakistanCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsSaving(true);
    try {
      await fetch('/api/platforms/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedApp.id,
          pakistanCheck: selectedApp.pakistanCheck,
          interviewNotes: selectedApp.interviewNotes,
          nextActionDate: selectedApp.nextActionDate,
        }),
      });
      showToast('Pakistan practical check saved');
    } catch {
      showToast('Error saving check');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
      const matchesSearch =
        search === '' ||
        (app.platformName || '').toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [applications, filterStatus, search]);

  const avgReadiness = useMemo(() => {
    if (applications.length === 0) return 0;
    const sum = applications.reduce((acc, a) => acc + (a.readinessScore || 0), 0);
    return Math.round(sum / applications.length);
  }, [applications]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Top Banner / Summary */}
      <div className="bg-gradient-to-r from-surface-container-high to-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
            <h2 className="text-lg font-bold text-on-surface">Vetted Networks &amp; Talent Pools (Group B)</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
            Where you get vetted and matched (Toptal, Arc.dev, Lemon.io, Gun.io, Braintrust, Andela, etc.). There is no open bidding;
            you pass screening once and get high-value direct contracts. Track your profile readiness and Pakistan practical payout eligibility.
          </p>
        </div>

        {/* Global Readiness Gauge */}
        <div className="flex items-center gap-3 bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-variant/30 shrink-0">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-high"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={avgReadiness >= 75 ? 'text-emerald-500' : avgReadiness >= 40 ? 'text-amber-500' : 'text-primary'}
                strokeDasharray={`${avgReadiness}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-on-surface">{avgReadiness}%</span>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Avg Readiness</div>
            <div className="text-xs text-on-surface font-medium">{applications.length} Networks Tracked</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter networks (Toptal, Arc, Lemon...)"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'not_started', 'screening', 'interview_scheduled', 'under_review', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Applications */}
      {loading ? (
        <div className="p-8 text-center text-xs text-on-surface-variant">Loading vetted networks...</div>
      ) : filteredApps.length === 0 ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs text-on-surface-variant">
          No vetted applications match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredApps.map((app) => {
            const checklist = app.checklist || [];
            const pk = app.pakistanCheck;

            return (
              <div
                key={app.id}
                className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex flex-col justify-between hover:border-outline-variant transition-all shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-on-surface">{app.platformName}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : app.status === 'screening' || app.status === 'interview_scheduled'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {app.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Readiness Score: <span className="font-bold text-primary">{app.readinessScore}%</span>
                      </div>
                    </div>

                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as VettedApplicationEntity['status'])}
                      className="text-xs bg-surface-container-high text-on-surface border border-outline-variant/30 rounded px-2 py-1"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="screening">In Screening</option>
                      <option value="interview_scheduled">Interview Scheduled</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1.5 bg-surface-container-high/40 p-2.5 rounded-lg border border-outline-variant/20 mb-3">
                    <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Readiness Checklist
                    </div>
                    {checklist.map((item, idx) => (
                      <label key={item.id || idx} className="flex items-center gap-2 cursor-pointer text-xs text-on-surface hover:text-primary">
                        <input
                          type="checkbox"
                          checked={Boolean(item.completed)}
                          onChange={(e) => handleUpdateChecklist(app.id, idx, e.target.checked)}
                          className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        <span className={item.completed ? 'line-through text-outline' : ''}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Pakistan Practical Payout Badge */}
                  <div className="text-[11px] text-on-surface-variant flex items-center justify-between bg-surface-container-high/20 px-2.5 py-1.5 rounded border border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-emerald-400">payments</span>
                      <span>
                        Pakistan Payout:{' '}
                        <strong className="text-on-surface">
                          {pk?.payoutMethod || 'Direct Wire / Wise / Payoneer'}
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-outline">
                      {pk?.contractorEligibility || 'Direct Individual Contractor'}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-outline-variant/20">
                  <span className="text-[10px] text-outline">
                    {app.nextActionDate ? `Next: ${new Date(app.nextActionDate).toLocaleDateString()}` : 'No date set'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Edit Pakistan Payout &amp; Notes</span>
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer / Modal: Pakistan Practical Check Editor */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant/30 p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-on-surface">{selectedApp.platformName}: Payout &amp; Terms Check</h3>
                <p className="text-xs text-on-surface-variant">Practical notes for Pakistani engineers and direct operators</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePakistanCheck} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Supported Payout Methods
                </label>
                <input
                  type="text"
                  value={selectedApp.pakistanCheck?.payoutMethod || ''}
                  onChange={(e) => {
                    setSelectedApp({
                      ...selectedApp,
                      pakistanCheck: {
                        ...selectedApp.pakistanCheck,
                        payoutMethod: e.target.value,
                      },
                    });
                  }}
                  placeholder="Wise, Payoneer, Direct Local Bank Wire, Crypto"
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Contractor Eligibility</label>
                  <input
                    type="text"
                    value={selectedApp.pakistanCheck?.contractorEligibility || ''}
                    onChange={(e) =>
                      setSelectedApp({
                        ...selectedApp,
                        pakistanCheck: {
                          ...selectedApp.pakistanCheck,
                          contractorEligibility: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Individual Pakistani Citizen allowed"
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Withdrawal / Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedApp.pakistanCheck?.withdrawalFeePercent || 0}
                    onChange={(e) =>
                      setSelectedApp({
                        ...selectedApp,
                        pakistanCheck: {
                          ...selectedApp.pakistanCheck,
                          withdrawalFeePercent: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="e.g. 2.5"
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tax_req"
                  checked={Boolean(selectedApp.pakistanCheck?.taxObligationsNoted)}
                  onChange={(e) =>
                    setSelectedApp({
                      ...selectedApp,
                      pakistanCheck: {
                        ...selectedApp.pakistanCheck,
                        taxObligationsNoted: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-outline-variant text-primary"
                />
                <label htmlFor="tax_req" className="text-xs text-on-surface font-medium cursor-pointer">
                  W-8BEN / Tax Treaty Form Handled (0% US Withholding)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Interview &amp; Screening Notes</label>
                <textarea
                  rows={2}
                  value={selectedApp.interviewNotes || ''}
                  onChange={(e) => setSelectedApp({ ...selectedApp, interviewNotes: e.target.value })}
                  placeholder="Add interview dates, test task link, recruiter contact..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
