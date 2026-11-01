'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CaptureForm() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawUrl = searchParams.get('url') || '';
    const rawTitle = searchParams.get('title') || '';
    const rawText = searchParams.get('text') || '';
    const rawPlatform = searchParams.get('platform') || '';

    setUrl(rawUrl);
    setTitle(rawTitle);
    setText(rawText);

    if (rawPlatform) {
      setPlatform(rawPlatform);
    } else if (rawUrl) {
      try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace('www.', '');
        if (host.includes('linkedin')) setPlatform('LinkedIn');
        else if (host.includes('upwork')) setPlatform('Upwork');
        else if (host.includes('reddit')) setPlatform('Reddit');
        else if (host.includes('twitter') || host.includes('x.com')) setPlatform('Twitter / X');
        else if (host.includes('wellfound')) setPlatform('Wellfound');
        else if (host.includes('contra')) setPlatform('Contra');
        else if (host.includes('toptal')) setPlatform('Toptal');
        else setPlatform(host);
      } catch {
        setPlatform('Web');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please provide the post or request text.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/client-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'paste',
          rawText: text,
          sourceUrl: url,
          sourcePlatform: platform || 'Quick Capture',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to capture lead');
      }

      setResult(data.request);
    } catch (err: any) {
      setError(err.message || 'Capture failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between max-w-xl mx-auto font-sans">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              ⚡
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Quick Capture</h1>
              <p className="text-xs text-slate-400">Save client requests with 1-click</p>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
            Opportunity Radar
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {result ? (
          <div className="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span className="text-lg">✓</span>
              <span>Lead Captured & Pitches Generated!</span>
            </div>

            <div className="space-y-2 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400">Platform: </span>
                <span className="font-semibold text-white">{result.sourcePlatform}</span>
              </div>
              {result.companyName && (
                <div>
                  <span className="text-slate-400">Entity: </span>
                  <span className="font-semibold text-white">{result.companyName}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400">Identified Need: </span>
                <span className="text-slate-200">{result.needSummary}</span>
              </div>
              <div>
                <span className="text-slate-400">Fit Score: </span>
                <span className="font-bold text-emerald-400">{result.matchScore}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="/client-requests"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 text-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Open in Opportunity Radar →
              </a>
              <button
                type="button"
                onClick={() => window.close()}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Detected Platform
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Upwork, LinkedIn, Reddit, etc."
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Post / Page URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Client Request / Post Content <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the client's public post, problem description, or selected text here..."
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Verbatim public evidence is extracted. No fake claims are ever generated.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⌛</span>
                  <span>Extracting Need & Generating Pitches...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Capture & Analyze Lead</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Bookmarklet installation guide */}
      <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span>🔖</span>
          <span>How to install Bookmarklet (Browser Shortcut)</span>
        </div>
        <p className="leading-relaxed">
          <strong>Desktop:</strong> Bookmark any page, edit the URL, and paste the code from Client Requests. When you find an Upwork or LinkedIn lead, highlight text and click the bookmark!
        </p>
        <p className="leading-relaxed text-slate-400/90 italic">
          <strong>Roman Urdu:</strong> Kisi bhi page pe bookmark create karein, URL ki jagah bookmarklet code paste karein. Jab koi job ya client post nazar aaye, text select karein aur bookmark pe click karein—lead seedha radar me add ho jayegi!
        </p>
      </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400 text-xs">Loading Quick Capture...</div>}>
      <CaptureForm />
    </Suspense>
  );
}
