'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, Clock, AlertTriangle, Play, ShieldAlert } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = () => {
    setLoading(true);
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setJobs(data.jobs);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // Polling every 5 seconds for live status
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            Durable Background Job Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Transactional worker engine with bounded concurrency, exponential backoff, jitter, and dead-letter queues.
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Worker Health Status Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-white">Active Queue Engine: Transactional In-Memory / PostgreSQL</div>
            <div className="text-[11px] text-slate-400">Worker Concurrency Limit: 2 parallel runners • Idempotency key tracking: Active</div>
          </div>
        </div>
        <div className="text-xs text-slate-300">
          Total Processed Jobs: <span className="font-bold text-white">{jobs.length}</span>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300">
            Recorded Execution Stream
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-6">Job ID & Type</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Priority & Retries</th>
                <th className="py-3 px-6">Idempotency Key</th>
                <th className="py-3 px-6">Payload / Outcome</th>
                <th className="py-3 px-6 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No background jobs recorded yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-white">
                      <div className="font-mono text-indigo-300 text-[11px]">{job.id}</div>
                      <div className="font-bold text-slate-200 mt-0.5">{job.jobType}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : job.status === 'running'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 animate-pulse'
                          : job.status === 'failed' || job.status === 'dead_letter'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      <div>Priority: <strong className="text-slate-200">{job.priority}</strong></div>
                      <div className="text-[10px] text-slate-500">Retries: {job.retryCount}/{job.maxRetries}</div>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400 truncate max-w-xs">
                      {job.idempotencyKey || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-[11px] text-slate-300">
                      {job.result ? (
                        <span className="text-emerald-400 font-mono text-[10px]">
                          {JSON.stringify(job.result).slice(0, 60)}...
                        </span>
                      ) : job.errorMessage ? (
                        <span className="text-rose-400">{job.errorMessage}</span>
                      ) : (
                        <span className="text-slate-500">Processing payload...</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-500 text-[11px]">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
