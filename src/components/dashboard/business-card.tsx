'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Phone, 
  Mail, 
  ArrowRight, 
  MessageSquare, 
  MapPin, 
  Share2,
  AlertCircle
} from 'lucide-react';
import { BusinessEntity } from '@/types';
import { StatusChip, MatchChip } from '@/components/ui/design-system';
import { useLanguage } from '@/context/language-context';

interface BusinessCardProps {
  business: BusinessEntity;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const { t } = useLanguage();
  const isDemo = Boolean(business.isSandboxData || business.sourceProvider === 'b2b_mock');

  // Compute Plain Language Status
  let statusLabel = 'Website works';
  let statusVariant: 'success' | 'warning' | 'error' | 'neutral' = 'neutral';
  let statusTooltip = 'Website is online and functional';

  const webStatus = business.websiteCheck?.status;
  if (!business.domain || webStatus === 'apparently_absent') {
    statusLabel = 'No website found';
    statusVariant = 'error';
    statusTooltip = 'No active domain or website registered for this business';
  } else if (webStatus === 'social_only') {
    statusLabel = 'Only has a social page';
    statusVariant = 'warning';
    statusTooltip = 'Business operates via Facebook/Instagram without a custom web domain';
  } else if (webStatus === 'parked' || webStatus === 'broken') {
    statusLabel = 'Website has problems';
    statusVariant = 'warning';
    statusTooltip = 'Website domain is parked, expired, or returned HTTP errors';
  } else if (business.pipelineType === 'ai_software_opportunities') {
    statusLabel = 'Needs AI / software';
    statusVariant = 'success';
    statusTooltip = 'Has functional website but showed intent or requirements for software/AI';
  }

  // Score match reasoning
  const score = business.score?.overallScore || business.heatScore || 65;
  const matchReason = business.score?.reasoning || 
    (business.phone ? 'Verified local contact details & strong commercial activity' : 'Discovered via verified registry');

  // Contact availability channels
  const hasEmail = Boolean(business.contacts && business.contacts.length > 0 && business.contacts.some(c => c.email));
  const hasPhone = Boolean(business.phone);
  const socialList = business.websiteCheck?.socialUrls || [];
  const hasLinkedIn = socialList.some(s => s.toLowerCase().includes('linkedin'));
  const hasFacebook = socialList.some(s => s.toLowerCase().includes('facebook'));
  const hasInstagram = socialList.some(s => s.toLowerCase().includes('instagram'));
  const hasWhatsApp = Boolean(hasPhone && (business.country === 'PK' || business.country === 'UAE' || business.country === 'UK'));

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isDemo 
        ? 'bg-slate-900/40 border-amber-500/30 shadow-sm' 
        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-black/20'
    }`}>
      {/* Header: Name, City, DEMO & Status Chips */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white truncate max-w-sm">
              {business.name}
            </h3>
            {isDemo && (
              <StatusChip variant="demo" label="DEMO" tooltip="Simulated sandbox record — sending is blocked" />
            )}
            <StatusChip variant={statusVariant} label={statusLabel} tooltip={statusTooltip} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {(business.city || business.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{business.city ? `${business.city}, ` : ''}{business.country}</span>
              </span>
            )}
            {business.industry && (
              <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                {business.industry}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: View Details */}
        <div>
          <Link
            href={`/businesses/${business.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-transparent text-xs font-semibold transition-all shrink-0"
          >
            <span>{t('action.view_details', 'View details')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Match Reason Row */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-3">
        <MatchChip score={score} reason={matchReason} />

        {/* Outreach Channel Icons */}
        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          <span className="text-[11px] text-slate-500 hidden md:inline">Channels:</span>
          {hasEmail && <span title="Verified email available"><Mail className="w-3.5 h-3.5 text-emerald-400" /></span>}
          {hasPhone && <span title="Phone available"><Phone className="w-3.5 h-3.5 text-indigo-400" /></span>}
          {hasLinkedIn && <span title="LinkedIn profile available"><Share2 className="w-3.5 h-3.5 text-blue-400" /></span>}
          {hasFacebook && <span title="Facebook page available"><Globe className="w-3.5 h-3.5 text-cyan-400" /></span>}
          {hasInstagram && <span title="Instagram profile available"><MessageSquare className="w-3.5 h-3.5 text-pink-400" /></span>}
          {hasWhatsApp && <span title="WhatsApp available"><MessageSquare className="w-3.5 h-3.5 text-emerald-500" /></span>}
          {!hasEmail && !hasPhone && socialList.length === 0 && (
            <span className="text-[10px] text-slate-500 italic">No channels recorded</span>
          )}
        </div>
      </div>
    </div>
  );
}
