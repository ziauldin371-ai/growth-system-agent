'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  MessageSquareShare, 
  Phone, 
  ExternalLink, 
  Copy, 
  Check, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  Globe,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { PageHeader, EmptyState, StatusChip, MatchChip } from '@/components/ui/design-system';
import { useLanguage } from '@/context/language-context';

export default function ContactManuallyPage() {
  const { t } = useLanguage();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leads/no-email');
      const data = await res.json();
      if (data.success && Array.isArray(data.businesses)) {
        setBusinesses(data.businesses);
      }
    } catch (err) {
      console.error('Failed to load manual outreach leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (id: string, pitch: string) => {
    navigator.clipboard.writeText(pitch);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleMarkContacted = (id: string) => {
    setContactedIds(prev => new Set(prev).add(id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Who should I contact myself?"
        subtitle="High-value businesses with no direct email: reach out directly via Facebook, Instagram, LinkedIn, WhatsApp, or phone."
        urduSubtitle="Bina email walay karobaar: Facebook, WhatsApp, LinkedIn ya phone ke zariye khud raabta karein."
        helpContent={{
          titleEn: 'How Manual Outreach Works',
          titleUr: 'Khud Raabta Karne Ka Tareeqa',
          pointsEn: [
            'These businesses have strong commercial activity and great reviews, but no public email address.',
            'Each card gives you a pre-written, verified pitch ready to copy and paste.',
            'Click "Open Profile" to go straight to their Facebook page, LinkedIn, or Instagram profile.',
            'Click "Mark as Contacted" once you have messaged them so you do not double-contact.',
          ],
          pointsUr: [
            'Yeh behtareen karobaar hain jin ki rating achi hai magar in ka koi public email mojood nahi.',
            'Har card ke neechay bana banaya paigham mojood hai jise aap aik click mein copy kar saktay hain.',
            'Open Profile daba kar in ke Facebook, Instagram ya LinkedIn par jayen.',
            'Paigham bhejne ke baad "Mark as Contacted" daba dein taake dobara message na ho.',
          ],
        }}
        actions={
          <Link
            href="/run-and-schedule"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Find More Businesses</span>
          </Link>
        }
      />

      {/* List of Manual Outreach Cards */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading businesses waiting for manual outreach...</p>
        </div>
      ) : businesses.length > 0 ? (
        <div className="space-y-4">
          {businesses.map((item) => {
            const id = item.id;
            const isContacted = contactedIds.has(id);
            const score = item.score?.overallScore || item.heatScore || 70;
            const phone = item.phone;
            const websiteStatus = item.websiteCheck?.status || (!item.domain ? 'No website found' : 'functional');
            const socialUrls: string[] = item.websiteCheck?.socialUrls || [];

            const linkedIn = socialUrls.find(s => s.toLowerCase().includes('linkedin'));
            const facebook = socialUrls.find(s => s.toLowerCase().includes('facebook'));
            const instagram = socialUrls.find(s => s.toLowerCase().includes('instagram'));

            const firstName = item.decisionMakerName ? item.decisionMakerName.split(' ')[0] : 'there';
            const pitch = item.pipelineType === 'ai_software_opportunities'
              ? `Hi ${firstName}, I came across ${item.name} and noticed your rapid commercial growth. I build custom AI workflows, Python automation, and internal tools that eliminate repetitive tasks. Would you be open to a 10-minute chat this week?`
              : `Hi ${firstName}, I noticed ${item.name} has great customer reviews but no standalone booking website. I build clean, fast modern websites that convert visitors directly into booked appointments. Would you be open to a brief chat this week?`;

            return (
              <div 
                key={id}
                className={`p-6 rounded-2xl border transition-all ${
                  isContacted
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-md shadow-black/20'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{item.name}</h3>
                      <StatusChip 
                        variant={item.domain ? 'neutral' : 'error'} 
                        label={item.domain ? 'Website works' : 'No website found'} 
                      />
                      {isContacted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          Contacted ✓
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{[item.city, item.country].filter(Boolean).join(', ')}</span>
                      </span>
                      {item.industry && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {item.industry}
                        </span>
                      )}
                      <span>Discovered via <strong>{item.sourceProvider}</strong></span>
                    </div>
                  </div>

                  <MatchChip score={score} reason={item.score?.rationale || 'High local demand & verified reviews'} />
                </div>

                {/* Available Channels */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium mr-1">Reach them via:</span>

                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{phone}</span>
                    </a>
                  )}

                  {facebook && (
                    <a
                      href={facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Facebook Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-semibold"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Instagram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {linkedIn && (
                    <a
                      href={linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-xs font-semibold"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Pre-written Ready Pitch */}
                <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">
                      Ready Pitch
                    </span>
                    <span className="text-slate-500">60-80 words, zero spam phrases</span>
                  </div>
                  <p className="text-xs text-slate-200 font-mono leading-relaxed select-all">
                    {pitch}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleCopy(id, pitch)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      {copiedId === id ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === id ? 'Copied to Clipboard!' : 'Copy Pitch'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/businesses/${id}`}
                        className="text-xs text-slate-400 hover:text-white underline mr-2"
                      >
                        View details
                      </Link>
                      <button
                        onClick={() => handleMarkContacted(id)}
                        disabled={isContacted}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isContacted
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isContacted ? 'Contacted' : 'Mark as Contacted'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<MessageSquareShare className="w-8 h-8 text-indigo-400" />}
          title="No businesses waiting for manual contact"
          description="All discovered businesses either have verified email addresses or have already been contacted."
          actionText="Find More Businesses"
          actionHref="/run-and-schedule"
        />
      )}
    </div>
  );
}
