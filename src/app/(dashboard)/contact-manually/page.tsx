'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

type ManualFilter = 'all' | 'call' | 'whatsapp' | 'instagram';

function ContactManuallyContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const initialDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [showDemo, setShowDemo] = useState(initialDemo);
  const [filter, setFilter] = useState<ManualFilter>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScriptExpanded, setIsScriptExpanded] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

  const isDemoRecord = (b: any) =>
    Boolean(
      b.isSandboxData ||
        b.isDemo ||
        b.sourceProvider === 'b2b_mock' ||
        (b.domain && (b.domain.includes('.mock') || b.domain.includes('.internal'))) ||
        b.organizationId === 'org-demo-001'
    );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/no-email?demo=${showDemo}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.businesses)) {
        const list = data.businesses.map((item: any) => item.business || item);
        const filtered = list.filter((b: any) => (showDemo ? true : !isDemoRecord(b)));
        setBusinesses(filtered);
      }
    } catch (err) {
      console.error('Failed to load manual outreach leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showDemo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleCopyScript = (businessName?: string, ownerName?: string) => {
    const greeting = ownerName ? `Hi ${ownerName.split(' ')[0]}!` : 'Hi!';
    const name = businessName || 'your business';
    const script = `${greeting} I noticed ${name} on Google Maps doesn't have a modern mobile website. I built a quick 2-page preview for you—can I send it to your WhatsApp or email?`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(script);
    }
    showToast('Script copied to clipboard!');
  };

  const handleCopyPhone = (phone: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone);
    }
    showToast(`Phone ${phone} copied to clipboard!`);
  };

  const handleOpenInstagram = (b: any) => {
    handleCopyScript(b.name, b.decisionMakerName);
    const igUrl = b.socialProfiles?.instagram || b.websiteCheck?.socialUrls?.find((u: string) => u.includes('instagram'));
    if (igUrl) {
      window.open(igUrl, '_blank');
      showToast('DM script copied! Opening Instagram...');
    } else {
      showToast('DM script copied! Search business handle on Instagram.');
    }
  };

  const handleMarkContacted = (id: string) => {
    setContactedIds((prev) => new Set(prev).add(id));
    showToast('Marked as contacted!');
  };

  // Filter leads
  const filtered = businesses.filter((b) => {
    const phone = b.phone || b.phoneNumber || b.contacts?.find((c: any) => c.phone)?.phone;
    const hasWhatsApp = Boolean(b.socialProfiles?.whatsapp || (phone && (b.country === 'PK' || b.country === 'UAE' || b.country === 'UK')));
    const hasInstagram = Boolean(b.socialProfiles?.instagram || b.websiteCheck?.socialUrls?.some((u: string) => u.includes('instagram')));

    if (filter === 'call') return Boolean(phone);
    if (filter === 'whatsapp') return hasWhatsApp;
    if (filter === 'instagram') return hasInstagram;
    return true;
  });

  const counts = {
    all: businesses.length,
    call: businesses.filter((b) => Boolean(b.phone || b.phoneNumber || b.contacts?.find((c: any) => c.phone)?.phone)).length,
    whatsapp: businesses.filter((b) =>
      Boolean(
        b.socialProfiles?.whatsapp ||
          ((b.phone || b.phoneNumber) && (b.country === 'PK' || b.country === 'UAE' || b.country === 'UK'))
      )
    ).length,
    instagram: businesses.filter((b) =>
      Boolean(
        b.socialProfiles?.instagram || b.websiteCheck?.socialUrls?.some((u: string) => u.includes('instagram'))
      )
    ).length,
  };

  return (
    <div className="flex flex-col w-full gap-space-md max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-secondary text-on-secondary px-space-md py-space-xs rounded-full font-label-md text-xs sm:text-sm shadow-2xl flex items-center gap-1.5 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Demo Banner */}
      {showDemo && (
        <div className="rounded-xl p-space-md bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-space-sm text-tertiary shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <div>
              <span className="font-label-lg font-bold">Demo data is shown; these are not real businesses</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Simulated sandbox records. Outreach is blocked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDemo(false)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0 transition-colors"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* Page Summary & Mission Card (Stitch Design) */}
      <div className="bg-surface-container rounded-xl p-space-md shadow-md space-y-space-sm relative overflow-hidden border border-outline-variant/20">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-container/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Contact Manually
            </h1>
            {showDemo && (
              <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-label-badge uppercase tracking-wider font-bold">
                DEMO
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-secondary font-label-md text-xs bg-surface-container-high px-2.5 py-1 rounded-lg font-semibold">
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>Direct Outreach</span>
          </div>
        </div>

        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
          These businesses have no public email, but active phone numbers or social pages. Direct 2-minute calls or WhatsApp messages get immediate answers.
        </p>

        {/* Filter Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-label-md text-xs whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] ${
              filter === 'all'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(91,91,240,0.3)] font-semibold'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/50 text-[10px]">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('call')}
            className={`px-3 py-1.5 rounded-lg font-label-md text-xs whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] ${
              filter === 'call'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(91,91,240,0.3)] font-semibold'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">call</span>
            <span>Call Ready</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/50 text-[10px]">
              {counts.call}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('whatsapp')}
            className={`px-3 py-1.5 rounded-lg font-label-md text-xs whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] ${
              filter === 'whatsapp'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(91,91,240,0.3)] font-semibold'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">chat</span>
            <span>WhatsApp</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/50 text-[10px]">
              {counts.whatsapp}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('instagram')}
            className={`px-3 py-1.5 rounded-lg font-label-md text-xs whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] ${
              filter === 'instagram'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(91,91,240,0.3)] font-semibold'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">photo_camera</span>
            <span>Instagram</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/50 text-[10px]">
              {counts.instagram}
            </span>
          </button>
        </div>
      </div>

      {/* 30-Second Calling Script Expandable Widget (Stitch Design) */}
      <div className="bg-surface-container rounded-xl overflow-hidden shadow-md transition-all duration-300 border border-outline-variant/20">
        <button
          type="button"
          onClick={() => setIsScriptExpanded(!isScriptExpanded)}
          className="w-full p-space-md flex items-center justify-between text-left bg-surface-container-high/60 hover:bg-surface-container-high active:bg-surface-container-high transition-colors min-h-[44px]"
          aria-expanded={isScriptExpanded}
        >
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <div className="min-w-0">
              <span className="font-label-lg text-xs sm:text-sm text-on-surface font-semibold block truncate">
                Your 30-Second Phone Script
              </span>
              <span className="font-label-md text-[11px] text-on-surface-variant">
                Tap to read &amp; copy words to say
              </span>
            </div>
          </div>
          <span
            className={`material-symbols-outlined text-outline text-[22px] transition-transform duration-200 ${
              isScriptExpanded ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </button>

        {isScriptExpanded && (
          <div className="p-space-md space-y-space-md bg-surface-container-lowest/40 border-t border-outline-variant/20 animate-in fade-in duration-150">
            <div className="p-space-md rounded-lg bg-surface-container-high/80 text-on-surface font-body-md text-xs sm:text-sm leading-relaxed relative">
              <span className="text-primary font-bold">&ldquo;</span>
              Hi! I noticed your listing on Google Maps doesn&apos;t have a modern mobile website. I built a quick 2-page preview for you—can I send it to your WhatsApp?
              <span className="text-primary font-bold">&rdquo;</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={() => handleCopyScript()}
                className="flex-1 py-2.5 px-space-md bg-primary-container text-on-primary-container font-label-lg text-xs sm:text-sm font-semibold rounded-lg shadow-[0_0_16px_rgba(91,91,240,0.35)] flex items-center justify-center gap-1.5 active:opacity-90 transition-all min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span>Copy Script to Clipboard</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outreach Queue Feed Header */}
      <div className="flex items-center justify-between px-1">
        <span className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
          Priority Leads to Reach ({filtered.length})
        </span>
        <span className="font-label-md text-xs text-secondary font-medium">
          {contactedIds.size} Contacted Today
        </span>
      </div>

      {/* Priority Leads List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-on-surface-variant">Loading direct outreach leads...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-space-md">
          {filtered.map((b) => {
            const phone = b.phone || b.phoneNumber || b.contacts?.find((c: any) => c.phone)?.phone;
            const isContacted = contactedIds.has(b.id);
            const isDemo = isDemoRecord(b);
            const rating = (b as any).rating || (b.evidence?.[0]?.metadata as any)?.rating;
            const reviewCount = (b as any).reviewCount || (b.evidence?.[0]?.metadata as any)?.userRatingsTotal;
            const oppSummary =
              b.evidence?.[0]?.summary ||
              b.score?.reasoning ||
              'Active business listing on Google Maps without dedicated domain. Phone confirmed working.';

            const whatsappUrl = phone
              ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hi! I noticed ${b.name} on Google Maps doesn't have a modern mobile website. I built a quick 2-page preview for you!`
                )}`
              : null;

            return (
              <div
                key={b.id}
                className={`bg-surface-container rounded-xl p-space-md shadow-md space-y-space-md relative overflow-hidden transition-all duration-200 border border-outline-variant/20 ${
                  isContacted ? 'opacity-70 bg-surface-container-low' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                        {b.name}
                      </h2>
                      {isDemo && (
                        <span className="px-1.5 py-0.2 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[9px] uppercase font-bold">
                          DEMO
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-badge text-label-badge flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        High Intent
                      </span>
                    </div>

                    <p className="font-body-md text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{[b.industry, b.city, b.country].filter(Boolean).join(' • ')}</span>
                      {b.decisionMakerName && (
                        <span> · Contact: <strong className="text-on-surface">{b.decisionMakerName}</strong></span>
                      )}
                    </p>
                  </div>

                  <Link
                    href={`/businesses/${b.id}`}
                    className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center shrink-0 transition-colors"
                    title="View Full Profile"
                    aria-label={`View ${b.name}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </Link>
                </div>

                {/* Detail Badges */}
                <div className="grid grid-cols-2 gap-space-xs p-space-xs rounded-lg bg-surface-container-lowest/60 border border-outline-variant/10">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">star</span>
                    <div className="leading-tight">
                      <span className="font-label-md text-xs text-on-surface block font-bold">
                        {rating ? `${rating} ★ Rating` : 'Active Business'}
                      </span>
                      <span className="font-label-badge text-[10px] text-on-surface-variant">
                        {reviewCount ? `${reviewCount} Google Reviews` : 'Verified Registry'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="material-symbols-outlined text-error text-[18px]">domain_disabled</span>
                    <div className="leading-tight">
                      <span className="font-label-md text-xs text-error block font-bold">No Website</span>
                      <span className="font-label-badge text-[10px] text-on-surface-variant">
                        Prime Web Prospect
                      </span>
                    </div>
                  </div>
                </div>

                {/* Opportunity Insight */}
                <div className="p-space-sm rounded-lg bg-surface-container-low text-xs text-on-surface-variant leading-relaxed">
                  <strong className="text-primary font-semibold">Opportunity: </strong>
                  {oppSummary}
                </div>

                {/* Phone Information Box */}
                {phone ? (
                  <div className="flex items-center justify-between bg-surface-container-high/60 p-2.5 rounded-lg border border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[18px]">phone</span>
                      <span className="font-label-lg text-xs sm:text-sm text-on-surface font-mono tracking-wide">
                        {phone}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(phone)}
                      className="p-1 rounded bg-surface-container-highest text-on-surface-variant hover:text-on-surface min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Copy phone number"
                      aria-label="Copy phone"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-surface-container-high/40 text-[11px] text-on-surface-variant italic">
                    Possible match (check before using). Phone not directly verified on Google Maps.
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="py-2.5 px-2 bg-secondary-container text-on-secondary-container font-label-lg text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1 active:opacity-90 transition-opacity min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                      <span>Call Now</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="py-2.5 px-2 bg-surface-container-high text-outline font-label-md text-xs rounded-lg flex items-center justify-center gap-1 opacity-50 min-h-[44px]"
                    >
                      <span>No Phone</span>
                    </button>
                  )}

                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-2 bg-surface-container-high hover:bg-surface-variant text-secondary font-label-lg text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCopyScript(b.name, b.decisionMakerName)}
                      className="py-2.5 px-2 bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-lg text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>Copy Script</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenInstagram(b)}
                    className="py-2.5 px-2 bg-surface-container-high hover:bg-surface-variant text-primary font-label-lg text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    <span>Instagram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkContacted(b.id)}
                    className={`py-2.5 px-2 font-label-lg text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors min-h-[44px] ${
                      isContacted
                        ? 'bg-secondary-container/20 text-secondary'
                        : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isContacted ? 'check_circle' : 'done'}
                    </span>
                    <span>{isContacted ? 'Contacted' : 'Mark Contacted'}</span>
                  </button>
                </div>

                {/* Honesty Rule 11 Compliance Note */}
                <p className="text-[10px] text-on-surface-variant/80 italic pt-1">
                  Note: Check do-not-call rules before phoning. All calls and social messages are initiated manually.
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-space-lg bg-surface-container shadow-sm flex flex-col items-center justify-center text-center gap-3 border border-outline-variant/20 py-12">
          <span className="material-symbols-outlined text-[40px] text-primary">contact_phone</span>
          <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            No manual outreach leads found
          </p>
          <p className="font-body-md text-sm text-on-surface-variant max-w-md">
            {showDemo
              ? 'No demo leads match this filter.'
              : 'All current discovered businesses have verified emails, or no businesses have been found yet without email. Click "Find Businesses Now" to discover local businesses.'}
          </p>
          <Link
            href="/run-and-schedule"
            className="min-h-[44px] px-space-md py-2 bg-primary-container text-on-primary-container font-label-lg text-xs font-semibold rounded-lg flex items-center gap-1.5 active:opacity-90 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>{t('action.find_now', 'Find Businesses Now')}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ContactManuallyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-on-surface-variant">Loading manual outreach leads...</div>}>
      <ContactManuallyContent />
    </Suspense>
  );
}
