'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  Share2, 
  Phone, 
  MapPin, 
  Sparkles,
  ArrowRight,
  FileText,
  Linkedin,
  Facebook
} from 'lucide-react';

export default function NoEmailBusinessesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/leads/no-email');
      const data = await res.json();
      if (data.success) {
        setItems(data.businesses);
      }
    } catch (err) {
      console.error('Failed to load no-email businesses:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-amber-400" />
            <span>No Email Available (Alternative Channels Only)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Active, legitimate commercial businesses that lack a public direct email address. Preserved in database with discovered contact forms and social profiles so high-value opportunities are never lost.
          </p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-200">Alternative Channel Strategy</div>
          <p className="text-amber-300/90 leading-relaxed">
            Many traditional service companies (contractors, medical practices, fabricators) conduct client intake via online quotation forms, phone, or LinkedIn rather than publishing direct employee inboxes. Use the customized pitches below to submit manual inquiries.
          </p>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading businesses without email...
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
          No businesses currently in this category.
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => {
            const { business, channels } = item;

            return (
              <div 
                key={idx}
                className="p-6 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-5 shadow-xl"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-100">{business.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono text-slate-300">
                        {business.country}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                      {business.phone && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{business.phone}</span>
                        </span>
                      )}
                      {business.city && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{business.city}, {business.region || ''}</span>
                        </span>
                      )}
                      <span className="text-slate-500">&bull;</span>
                      <span>{business.industry}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 font-semibold">
                      ICP Score: {business.score?.overallScore || 'N/A'}/100
                    </span>
                    <Link
                      href={`/businesses/${business.id}`}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <span>Dossier</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </Link>
                  </div>
                </div>

                {/* Channels Grid */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Discovered Alternative Contact Channels ({channels?.length || 0})
                  </div>

                  {channels && channels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {channels.map((ch: any) => {
                        const isCopied = copiedId === ch.id;

                        return (
                          <div
                            key={ch.id}
                            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-semibold text-slate-200 capitalize">
                                  {ch.platform.replace('_', ' ')}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono truncate max-w-[160px]">
                                  {ch.handleOrIdentifier || ch.sourceName}
                                </div>
                              </div>

                              <a
                                href={ch.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                              >
                                <span>Open {ch.platform === 'contact_form' ? 'Form' : 'Profile'}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-300">
                              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Tailored Pitch for this Channel</span>
                              </div>
                              <p className="line-clamp-4 leading-relaxed font-sans text-slate-300">
                                {ch.customPitch}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
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
                                    <span>Copy Pitch</span>
                                  </>
                                )}
                              </button>

                              <select
                                value={ch.status}
                                onChange={(e) => handleStatusChange(ch.id, e.target.value)}
                                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 focus:outline-none"
                              >
                                <option value="not_contacted">Not Contacted</option>
                                <option value="manually_contacted">Contacted via Form</option>
                                <option value="replied">Replied</option>
                                <option value="not_applicable">N/A</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-500">
                      No public channels recorded for this business. Telephone inquiries can be made directly.
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

