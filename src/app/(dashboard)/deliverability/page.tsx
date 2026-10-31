'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Lock, 
  Radio, 
  Copy, 
  RefreshCw,
  Power
} from 'lucide-react';

export default function DeliverabilityPage() {
  const [domainInput, setDomainInput] = useState('');
  const [isCheckingDns, setIsCheckingDns] = useState(false);
  const [dnsResult, setDnsResult] = useState<any | null>(null);
  const [dnsGuide, setDnsGuide] = useState<any | null>(null);

  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<any | null>(null);

  const [isRunningPlacement, setIsRunningPlacement] = useState(false);
  const [placementResult, setPlacementResult] = useState<any | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [emergencyStop, setEmergencyStop] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDnsCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainInput.trim()) return;

    setIsCheckingDns(true);
    try {
      const res = await fetch('/api/deliverability/dns-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDnsResult(data.health);
        setDnsGuide(data.guide);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingDns(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/gmail/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: 'ziauldin371@gmail.com' }),
      });
      const data = await res.json();
      setTestEmailResult(data);
    } catch (err: any) {
      setTestEmailResult({ success: false, error: err.message });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleRunPlacementTest = async () => {
    setIsRunningPlacement(true);
    setPlacementResult(null);
    try {
      const res = await fetch('/api/deliverability/placement-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSubject: 'Technical Diagnostic: AI Automation Architecture',
          templateName: 'executive_diagnostic_v1',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPlacementResult(data.test);
      } else {
        setPlacementResult({ error: data.error || 'Placement test could not complete.' });
      }
    } catch (err: any) {
      setPlacementResult({ error: err.message });
    } finally {
      setIsRunningPlacement(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Deliverability Center & Seed Placement</h1>
            <p className="text-sm text-slate-400">
              Dedicated domain authentication (SPF, DKIM, DMARC), bounce thresholds, and honest seed placement verification.
            </p>
          </div>
        </div>
      </div>

      {/* Production Auto-Send Prerequisite Lock */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Production Safety Lock</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Auto-send waiting for Gmail test</h3>
            <p className="text-xs text-slate-400 max-w-xl">
              In production mode, autonomous email sending remains locked until at least one real verification email to{' '}
              <strong className="text-slate-200">ziauldin371@gmail.com</strong> is confirmed with a verified message ID in Gmail Sent.
              Until unlocked, all qualified leads run safely in draft mode.
            </p>
          </div>

          <button
            onClick={handleSendTestEmail}
            disabled={isSendingTestEmail}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 shrink-0"
          >
            {isSendingTestEmail ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Dispatching Test...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Verification to ziauldin371@gmail.com</span>
              </>
            )}
          </button>
        </div>

        {testEmailResult && (
          <div className="mt-4 pt-4 border-t border-amber-500/20 text-xs">
            {testEmailResult.success ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Verification Email Confirmed!</strong> Message ID: <code className="text-emerald-200">{testEmailResult.messageId}</code>.
                  Verified in Gmail Sent folder. Auto-send prerequisite is unlocked.
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Test Send Blocked or Unconfigured:</strong> {testEmailResult.error || testEmailResult.message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: Domain DNS Health & Safeguard Thresholds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain Health Checker (2 columns) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Dedicated Domain Authentication</h2>
              <p className="text-xs text-slate-400">Audit your custom sending domain for SPF, DKIM, DMARC, and MX records.</p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400">DNS Live Query</span>
          </div>

          <form onSubmit={handleDnsCheck} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. youragency.com or google.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isCheckingDns || !domainInput.trim()}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {isCheckingDns ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Inspect DNS</span>
            </button>
          </form>

          {dnsResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">SPF Record</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                    {dnsResult.spfStatus === 'pass' ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Valid</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">DKIM Key</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                    {dnsResult.dkimStatus === 'pass' ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Unchecked</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">DMARC Policy</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                    {dnsResult.dmarcStatus === 'pass' ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {dnsResult.dmarcPolicy}</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">MX Routing</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                    {dnsResult.mxStatus === 'pass' ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Configured</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actionable DNS Snippets */}
              {dnsGuide && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 text-xs">
                  <div className="font-semibold text-slate-200">Recommended DNS Records for Google Workspace:</div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-[11px] text-slate-300">
                      <span>{dnsGuide.spfTemplate}</span>
                      <button
                        onClick={() => handleCopy(dnsGuide.spfTemplate, 'spf')}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        {copiedKey === 'spf' ? 'Copied' : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-[11px] text-slate-300">
                      <span className="truncate pr-2">{dnsGuide.dmarcTemplate}</span>
                      <button
                        onClick={() => handleCopy(dnsGuide.dmarcTemplate, 'dmarc')}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        {copiedKey === 'dmarc' ? 'Copied' : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Safeguard Thresholds & Kill Switch (1 column) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">Automated Throttle Rules</h2>
              <p className="text-xs text-slate-400">Strict safety gates guarding sender reputation.</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Auto-Throttle Trigger</span>
                  <span className="font-semibold text-amber-400">&gt; 3.0% Bounce</span>
                </div>
                <p className="text-[11px] text-slate-500">Automatically halves daily dispatch quota upon exceeding 3%.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Auto-Pause & Alert</span>
                  <span className="font-semibold text-rose-400">&gt; 5.0% Bounce / Complaint</span>
                </div>
                <p className="text-[11px] text-slate-500">Immediately halts campaign and alerts operator via urgent email.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Warm-Up Ramp</span>
                  <span className="font-semibold text-indigo-400">10 / day &rarr; +5 weekly</span>
                </div>
                <p className="text-[11px] text-slate-500">Enforces gradual volume ramp with 2-5 min random spacing.</p>
              </div>
            </div>
          </div>

          {/* Emergency Stop Kill Switch */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setEmergencyStop(!emergencyStop)}
              className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                emergencyStop 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{emergencyStop ? 'EMERGENCY STOP ACTIVE' : 'Arm Emergency Kill-Switch'}</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2">
              {emergencyStop ? 'All outbound sending and queue workers are blocked.' : 'Click to instantly freeze all outbound email pipelines.'}
            </p>
          </div>
        </div>
      </div>

      {/* Honest Seed Placement Tester */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Honest Seed Placement Probes</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dispatches real probe emails to your configured test inboxes (Gmail, Outlook, Yahoo, Workspace). Zero simulated results.
            </p>
          </div>

          <button
            onClick={handleRunPlacementTest}
            disabled={isRunningPlacement}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 shrink-0"
          >
            {isRunningPlacement ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Real Probe...</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Run Seed Placement Test</span>
              </>
            )}
          </button>
        </div>

        {placementResult && (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            {placementResult.error ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Placement Testing Status: Not Measured</strong>
                  <p className="mt-1 text-slate-400">
                    {placementResult.error}. To measure real inbox placement, add your test inboxes in environment (<code>SEED_INBOX_GMAIL</code>, <code>SEED_INBOX_OUTLOOK</code>, <code>SEED_INBOX_YAHOO</code>).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  Real Seed Inboxes Probed ({placementResult.totalSeedsSent} sent):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {placementResult.providerBreakdown?.map((seed: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-xs font-medium text-slate-200">{seed.provider}</div>
                      <div className="text-[11px] text-slate-400 truncate">{seed.email}</div>
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Result:</span>
                        <span className={`font-semibold ${seed.result === 'sent' ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {seed.result === 'sent' ? 'Sent (confirmed)' : (seed.result || 'Not measured')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

