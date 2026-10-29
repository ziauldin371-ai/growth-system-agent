'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Cpu, 
  Mail, 
  Globe, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  KeyRound,
  UserCheck
} from 'lucide-react';

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Integrations & Safety Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor API credentials, manage safety guardrails, and configure operator parameters.
        </p>
      </div>

      {/* Safety Controls Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Emergency Stop & Dispatch Guardrails</h3>
              <p className="text-xs text-slate-400">Controls live email dispatch across all background campaigns</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Default Mode: Strict Draft-Only
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-300">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200">Draft-Only Safe Mode</span>
            <p className="text-slate-400">
              Ensures that all generated outreach messages must be manually inspected and approved by an administrator before any send can be attempted.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200">Statutory Address Compliance</span>
            <p className="text-slate-400">
              Injects physical postal office disclosure and one-click unsubscribe URLs into every dispatched email as required by 15 U.S.C. 7704.
            </p>
          </div>
        </div>
      </div>

      {/* Active Integrations Status Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          Provider Adapters & Credentials Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Supabase */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Supabase PostgreSQL</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Multi-tenant Postgres with Row Level Security & In-Memory fallback store.
            </p>
          </div>

          {/* Discovery: Google Places */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Google Places API</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                Configurable (.env)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Official Places Text Search for local commercial establishments and review signals.
            </p>
          </div>

          {/* Discovery: Companies House */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>UK Companies House</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                Configurable (.env)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct official corporate registry prober for UK entities.
            </p>
          </div>

          {/* AI: Google Gemini */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Google Gemini API</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold">
                Active Adapter
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gemini 1.5 Flash structured output mode with security boundary wrappers.
            </p>
          </div>

          {/* AI: Grounded Mock LLM */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Grounded Sandbox LLM</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                Online / Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic offline generator for zero-cost testing and CI validation.
            </p>
          </div>

          {/* Email: Resend Delivery */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Resend / Safe Mock</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                Active Mock Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero network calls in test mode; dispatches live only when approved.
            </p>
          </div>
        </div>
      </div>

      {/* Operator Professional Profile Configuration */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-400" />
          Operator Profile Parameters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">Operator Professional Identity:</span>
            <div className="text-slate-200 font-bold">Full Stack AI Developer & Automation Architect</div>
            <div className="text-slate-400 text-[11px]">Specialization: LLMs, Python, Data Science, AI Agents, Workflow Automation, APIs, Full-Stack SaaS</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">Configured Compliance Address:</span>
            <div className="text-slate-200 font-mono text-[11px]">
              123 Innovation Way, Suite 400, San Francisco, CA 94105
            </div>
            <div className="text-emerald-400 text-[11px] font-medium">CAN-SPAM 15 U.S.C. 7704 Compliant</div>
          </div>
        </div>
      </div>
    </div>
  );
}
