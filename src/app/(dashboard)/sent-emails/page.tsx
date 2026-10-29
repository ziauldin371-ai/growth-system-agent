'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Building, 
  Globe, 
  Search, 
  Send,
  Layers
} from 'lucide-react';

export default function SentEmailsPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadSent() {
      try {
        const res = await fetch('/api/leads/sent');
        const data = await res.json();
        if (data.success) {
          setEmails(data.emails);
        }
      } catch (err) {
        console.error('Failed to load sent emails:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSent();
  }, []);

  const filtered = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.businessName?.toLowerCase().includes(q) ||
      e.recipientEmail?.toLowerCase().includes(q) ||
      e.selectedSubject?.toLowerCase().includes(q) ||
      e.gmailMessageId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-400" />
            <span>Sent Emails (Gmail API History)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Outreach messages submitted directly through Google Gmail REST API from <span className="text-indigo-300 font-mono">ziauldin371@gmail.com</span>. Recorded in your Gmail Sent mailbox.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://mail.google.com/mail/u/0/#sent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
          >
            <span>Open Gmail Sent Folder</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <Link
            href="/email-sent-plus-channels"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Channel Targets</span>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient, business, subject, or message ID..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="font-mono text-indigo-400 font-semibold">{filtered.length}</span> sent messages
        </div>
      </div>

      {/* Table of Sent Messages */}
      <div className="rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading sent email records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            No sent messages found. Dispatches made in auto-send mode or approved via queue will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Recipient & Business</th>
                  <th className="py-3 px-4">Subject Line</th>
                  <th className="py-3 px-4">Gmail Message ID</th>
                  <th className="py-3 px-4">Sent Timestamp</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4 text-right">Gmail Sent Mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((item) => {
                  const gmailUrl = item.gmailUrl || (item.gmailMessageId ? `https://mail.google.com/mail/u/0/#sent/${item.gmailMessageId}` : 'https://mail.google.com/mail/u/0/#sent');

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{item.businessName}</span>
                          {(item.recipientEmail?.includes('.mock') || item.recipientEmail?.includes('.internal') || (item as any).isSandboxData) && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              DEMO
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                            {item.country}
                          </span>
                        </div>
                        <div className="font-mono text-emerald-400 text-[11px] mt-0.5">
                          {item.recipientEmail}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-200 font-medium truncate">
                          {item.selectedSubject}
                        </div>
                        <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                          Strategy: {item.strategy?.replace('_', ' ')}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">
                        {item.gmailMessageId ? (
                          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                            {item.gmailMessageId}
                          </span>
                        ) : (
                          <span className="text-slate-600">Pending</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.sentAt ? new Date(item.sentAt).toLocaleString() : 'Recently'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.gmailConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sent (confirmed)</span>
                          </span>
                        ) : item.reconciledStatus === 'uncertain' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Sent (uncertain)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-slate-400" />
                            <span>{item.deliveryStatus || 'Sent'}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <a
                          href={gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs transition-colors"
                        >
                          <span>Open in Sent</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

