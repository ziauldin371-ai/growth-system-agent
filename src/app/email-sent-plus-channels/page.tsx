'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  MailCheck, 
  Calendar, 
  Sparkles, 
  CheckCircle2,
  Linkedin,
  Twitter,
  Instagram,
  FileText,
  Globe,
  Bell
} from 'lucide-react';

export default function EmailSentPlusChannelsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/leads/sent-plus-channels');
      const data = await res.json();
      if (data.success) {
        setItems(data.multiChannelTargets);
      }
    } catch (err) {
      console.error('Failed to load multi-channel targets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyPitch = (id: string, pitch: string) => {
    navigator.clipboard.writeText(pitch);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStatusChange = async (channelId: string, status: string) => {
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleReminderChange = async (channelId: string, reminderDate: string) => {
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderDate }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin':
        return <Linkedin className="w-4 h-4 text-sky-400" />;
      case 'twitter':
        return <Twitter className="w-4 h-4 text-cyan-400" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case 'contact_form':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      default:
        return <Globe className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Email Sent + Other Channels (Multi-Touch Follow-up)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            High-intent prospective clients that have already received an outreach email and possess verified alternative channels for gentle, professional follow-up.
          </p>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-indigo-200">Multi-Channel Follow-up Protocol</div>
          <p className="text-indigo-300/90 leading-relaxed">
            Pitches below are specifically tailored to reference your initial email respectfully (e.g. &ldquo;Sent a note to your inbox regarding Python RAG pipelines...&rdquo;). Never spam or duplicate messages across all platforms at once; use the reminder selector to space follow-ups.
          </p>
        </div>
      </div>

      {/* Grid of Multi-Touch Targets */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading multi-channel prospective clients...
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
          No records currently qualify for multi-touch follow-up. When emails are sent to businesses that also have verified alternative channels, they will appear here automatically.
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => {
            const { business, draft, channels } = item;
            const gmailUrl = draft.gmailUrl || `https://mail.google.com/mail/u/0/#sent/${draft.gmailMessageId}`;

            return (
              <div 
                key={idx}
                className="p-6 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-5 shadow-xl"
              >
                {/* Header row: Business & Sent Email Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-100">{business.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono text-slate-300">
                        {business.country}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Email Sent: {draft.sentAt ? new Date(draft.sentAt).toLocaleDateString() : 'Recently'}
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-300 font-mono text-[11px]">{draft.recipientEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={gmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
                    >
                      <MailCheck className="w-3.5 h-3.5" />
                      <span>View in Gmail Sent</span>
                      <ExternalLink className="w-3 h-3 text-indigo-400" />
                    </a>
                  </div>
                </div>

                {/* Discovered Alternative Platforms */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Discovered Professional Follow-up Channels ({channels.length})
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.map((ch: any) => {
                      const isCopied = copiedId === ch.id;

                      return (
                        <div
                          key={ch.id}
                          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between"
                        >
                          {/* Channel Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                                {getPlatformIcon(ch.platform)}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-200 capitalize">
                                  {ch.platform.replace('_', ' ')}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
                                  {ch.handleOrIdentifier || ch.sourceName}
                                </div>
                              </div>
                            </div>

                            <a
                              href={ch.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                            >
                              <span>Open Profile</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          </div>

                          {/* Follow-up Pitch */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-300">
                            <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Personalized Follow-Up Pitch</span>
                            </div>
                            <p className="line-clamp-4 leading-relaxed font-sans text-slate-300">
                              {ch.customPitch}
                            </p>
                          </div>

                          {/* Action Toolbar */}
                          <div className="space-y-2 pt-2 border-t border-slate-900 text-xs">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => handleCopyPitch(ch.id, ch.customPitch)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Copy Follow-Up Pitch</span>
                                  </>
                                )}
                              </button>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500">Status:</span>
                                <select
                                  value={ch.status}
                                  onChange={(e) => handleStatusChange(ch.id, e.target.value)}
                                  className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 focus:outline-none"
                                >
                                  <option value="not_contacted">Not Contacted</option>
                                  <option value="manually_contacted">Followed Up</option>
                                  <option value="replied">Replied</option>
                                  <option value="not_applicable">N/A</option>
                                </select>
                              </div>
                            </div>

                            {/* Reminder Option */}
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 text-slate-500">
                                <Bell className="w-3 h-3 text-amber-400" />
                                <span>Follow-up Reminder:</span>
                              </span>
                              <input
                                type="date"
                                value={ch.reminderDate ? ch.reminderDate.split('T')[0] : ''}
                                onChange={(e) => handleReminderChange(ch.id, e.target.value)}
                                className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

