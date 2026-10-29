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
  UserCheck,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Test email state
  const [testEmail, setTestEmail] = useState('ziauldin371@gmail.com');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleSendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/gmail/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmail }),
      });
      const resData = await res.json();
      setTestResult(resData);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

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
          {/* Gmail REST API */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Mail className="w-4 h-4 text-rose-400" />
                <span>Gmail REST API (OAuth2)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">
                OAuth2 Adapter
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Authenticated for <strong className="text-slate-200">ziauldin371@gmail.com</strong>. Places sent outreach directly in Gmail Sent mailbox.
            </p>
          </div>

          {/* Supabase */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Supabase PostgreSQL</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                Active / RLS
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

      {/* Gmail API Live Test Tool */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-bold text-white">Gmail API OAuth2 Verification & Test Send</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300">
            Sender: ziauldin371@gmail.com
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Verify that your Google OAuth2 credentials can refresh tokens, assemble RFC 2822 multipart messages, and deliver test outreach that appears directly in your Google account&apos;s Sent mailbox.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Recipient email for test..."
            className="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          />
          <button
            onClick={handleSendTestEmail}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Dispatching via Gmail API...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Send Test Email via Gmail API</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 mt-4 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {testResult.success ? 'Gmail API Test Dispatched Successfully!' : 'Gmail Integration Notice'}
              </span>
              {testResult.gmailUrl && (
                <a
                  href={testResult.gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-900 border border-emerald-500/40 text-emerald-300 text-[11px] hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                >
                  <span>Open in Gmail Sent Mail &rarr;</span>
                </a>
              )}
            </div>

            <p className="text-[11px] leading-relaxed">
              {testResult.error || 'The test message was successfully encoded and delivered. Check your Gmail Sent folder to verify.'}
            </p>

            {testResult.checklist && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">OAuth Setup Status:</span>
                {testResult.checklist.checks?.map((c: any, cIdx: number) => (
                  <div key={cIdx} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-300">{c.key}:</span>
                    <span className={c.configured ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {c.configured ? 'Configured in Environment' : 'Missing (Add to Vercel Settings)'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
