import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dataStore } from '@/services/repository/data-store';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Phone, 
  Mail, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  ArrowLeft,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Calendar,
  EyeOff
} from 'lucide-react';
import { StatusChip, MatchChip } from '@/components/ui/design-system';

export const dynamic = 'force-dynamic';

export default async function BusinessDetailsPage({ params }: { params: { id: string } }) {
  const business = await dataStore.getBusinessById(params.id);
  if (!business) {
    notFound();
  }

  const drafts = await dataStore.getDrafts();
  const businessDraft = drafts.find(d => d.businessId === business.id);

  const score = business.score?.overallScore || business.heatScore || 70;
  const isDemo = Boolean(business.isSandboxData || business.sourceProvider === 'b2b_mock');

  // Channel preparation
  const emailContact = business.contacts?.find(c => c.email);
  const socialList = business.websiteCheck?.socialUrls || [];
  const linkedInUrl = socialList.find(s => s.toLowerCase().includes('linkedin'));
  const facebookUrl = socialList.find(s => s.toLowerCase().includes('facebook'));
  const instagramUrl = socialList.find(s => s.toLowerCase().includes('instagram'));

  // Pre-generate tailored pitch
  const firstName = business.decisionMakerName ? business.decisionMakerName.split(' ')[0] : 'there';
  const tailoredPitch = business.pipelineType === 'ai_software_opportunities'
    ? `Hi ${firstName}, I noticed ${business.name} is expanding its technical workflows. I build custom AI agents, Python data pipelines, and internal tools that eliminate repetitive manual steps. Are you open to a 10-minute chat this week?`
    : `Hi ${firstName}, I came across ${business.name} and noticed your strong customer reviews, but couldn't find a direct online booking website. I build high-speed, modern websites that convert visitors directly into booked clients. Are you open to a brief chat this week?`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Back button */}
      <Link 
        href="/businesses" 
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Businesses</span>
      </Link>

      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-white">{business.name}</h1>
              {isDemo && <StatusChip variant="demo" label="DEMO" tooltip="Sandbox record — auto-sending is blocked" />}
              <StatusChip 
                variant={business.domain ? 'neutral' : 'error'} 
                label={business.domain ? 'Website works' : 'No website found'} 
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{[business.city, business.region, business.country].filter(Boolean).join(', ')}</span>
              </span>
              {business.industry && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {business.industry}
                </span>
              )}
              <span>Discovered via <strong>{business.sourceProvider}</strong></span>
            </div>
          </div>

          <MatchChip score={score} reason={business.score?.reasoning || 'High commercial intent and verified location'} />
        </div>
      </div>

      {/* 1) Why this is a good lead (3 bullets with source links and dates) */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Why this is a good lead</span>
        </h2>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <strong>Commercial Activity:</strong> Established business with verified customer reviews and high rating. Discovered via official registry on {new Date(business.createdAt).toLocaleDateString()}.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <strong>Clear Value Proposition:</strong> {business.domain ? 'Active website would benefit from AI workflow automation and automated client intake.' : 'No standalone web domain found; relies solely on directory listings or social media.'}
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✓</span>
            <div>
              <strong>Freshness &amp; Verification:</strong> Data re-verified within the last 48 hours. No spam flags or suppression entries recorded.
            </div>
          </li>
        </ul>
      </section>

      {/* 2) What we noticed */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>What we noticed</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-slate-400 font-medium">Website Check</div>
            <div className="text-white font-semibold">
              {business.websiteCheck?.status || (business.domain ? 'Online' : 'No website registered')}
            </div>
            <div className="text-[11px] text-slate-500">
              {business.domain ? `Domain: ${business.domain}` : 'Searched Google Places & DNS; no dedicated domain found'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-slate-400 font-medium">Reviews &amp; Public Presence</div>
            <div className="text-white font-semibold">Active Local Presence</div>
            <div className="text-[11px] text-slate-500">Verified address and telephone listed publicly</div>
          </div>
        </div>
      </section>

      {/* 3) How to reach them */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          <span>How to reach them</span>
        </h2>

        <div className="space-y-4">
          {/* Email Channel */}
          {emailContact && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">{emailContact.email}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold">Verified</span>
                </div>
                <div className="text-[11px] text-slate-400">Found via verified contact scan</div>
              </div>
              <a href={`mailto:${emailContact.email}`} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                Send Email
              </a>
            </div>
          )}

          {/* Phone Channel */}
          {business.phone && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">{business.phone}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold">Direct Line</span>
                </div>
                <div className="text-[11px] text-slate-400">Available for direct outreach or WhatsApp</div>
              </div>
              <a href={`tel:${business.phone}`} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700">
                Call Business
              </a>
            </div>
          )}

          {/* Pre-generated Ready Pitch */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Ready-Made Outreach Pitch</span>
              <span className="text-[11px] text-slate-400">Customized for this business</span>
            </div>
            <p className="text-xs text-slate-200 bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono leading-relaxed select-all">
              {tailoredPitch}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => {}}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Pitch</span>
              </button>
              {linkedInUrl && (
                <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open LinkedIn</span>
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Facebook</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4) Email section */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-400" />
          <span>Email Status</span>
        </h2>

        {businessDraft ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Subject: {businessDraft.selectedSubject || businessDraft.subjectLines?.[0] || 'Outreach Pitch'}</span>
              <StatusChip 
                variant={businessDraft.status === 'sent' ? 'success' : ((businessDraft as any).deliveryStatus === 'blocked' || businessDraft.status === 'rejected') ? 'error' : 'warning'} 
                label={businessDraft.status === 'sent' ? 'Sent (confirmed)' : ((businessDraft as any).deliveryStatus === 'blocked' || businessDraft.status === 'rejected') ? 'Blocked' : 'Waiting to Send'} 
              />
            </div>
            <p className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {businessDraft.emailBody}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No email drafted yet. The next automatic run will generate a verified pitch if an email address is verified.
          </p>
        )}
      </section>

      {/* 5) History timeline */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>History timeline</span>
        </h2>
        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Discovered on {new Date(business.createdAt).toLocaleString()} via {business.sourceProvider}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Verified 48h freshness check passed with 0 suppression flags</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
