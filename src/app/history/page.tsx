'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Mail, 
  Globe, 
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function RunHistoryPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setRuns(data.runs);
      }
    } catch (err) {
      console.error('Failed to load run history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Run History & Observability</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit logs for twice-daily autonomous executions (09:00 & 17:00 Asia/Karachi). Track sources, discovered prospects, Gmail dispatches, and skipped reasons.
          </p>
        </div>

        <div>
          <button
            onClick={fetchRuns}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Runs List */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading execution history...
        </div>
      ) : runs.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
          No automated runs recorded yet. Invocations triggered by cron or &ldquo;Run Now&rdquo; in the dashboard will be logged here.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run, idx) => {
            const isSuccess = run.status === 'completed';
            const isSkipped = run.status === 'skipped';

            return (
              <div 
                key={idx}
                className="p-5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-4 shadow-xl"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSuccess ? 'bg-emerald-400' : isSkipped ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    <span className="font-bold text-sm text-slate-100 font-mono">{run.runId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      isSuccess 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : isSkipped 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {run.status}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase font-mono">
                      Mode: {run.operatingMode}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{run.startTimePkt || new Date(run.executedAt || Date.now()).toLocaleString()}</span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Discovered</div>
                    <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">{run.leadsDiscovered ?? 0}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Qualified (ICP)</div>
                    <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5">{run.leadsQualified ?? 0}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Drafts Generated</div>
                    <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">{run.draftsGenerated ?? 0}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Sent to Gmail</div>
                    <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{run.emailsSent ?? 0}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Duration</div>
                    <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">
                      {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '< 1s'}
                    </div>
                  </div>
                </div>

                {/* Execution Details & Skipped Reasons */}
                <div className="text-xs text-slate-400 space-y-2 pt-2">
                  {run.reason && (
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-amber-300/90">
                      <strong>Execution Notice:</strong> {run.reason}
                    </div>
                  )}

                  {run.skippedReasons && Object.keys(run.skippedReasons).length > 0 && (
                    <div>
                      <span className="text-slate-500 font-medium">Filtered / Skipped Records: </span>
                      {Object.entries(run.skippedReasons).map(([r, count], rIdx) => (
                        <span key={rIdx} className="inline-block mr-3 text-slate-400">
                          &bull; {r}: <span className="font-mono text-slate-300 font-semibold">{count as any}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {run.nextScheduledRunPkt && (
                    <div className="flex items-center gap-1.5 text-slate-400 pt-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Next Scheduled Execution: <strong className="text-indigo-300">{run.nextScheduledRunPkt}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

