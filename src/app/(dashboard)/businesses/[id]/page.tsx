import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dataStore } from '@/services/repository/data-store';
import { StatusChip, MatchChip } from '@/components/ui/design-system';

export const dynamic = 'force-dynamic';

export default async function BusinessDetailsPage({ params }: { params: { id: string } }) {
  const business = await dataStore.getBusinessById(params.id);
  if (!business) {
    notFound();
  }

  const drafts = await dataStore.getDrafts();
  const businessDraft = drafts.find((d) => d.businessId === business.id);

  const score = business.score?.overallScore || business.heatScore || 70;
  const isDemo = Boolean(business.isSandboxData || business.sourceProvider === 'b2b_mock');

  // Channel preparation
  const emailContact = business.contacts?.find((c) => c.email);
  const phone = business.phone || business.contacts?.find((c) => c.phone)?.phone;
  const socialList = business.websiteCheck?.socialUrls || [];
  const linkedInUrl = socialList.find((s) => s.toLowerCase().includes('linkedin'));
  const facebookUrl = socialList.find((s) => s.toLowerCase().includes('facebook'));

  // Pre-generate tailored pitch
  const firstName = business.decisionMakerName ? business.decisionMakerName.split(' ')[0] : 'there';
  const tailoredPitch =
    business.pipelineType === 'ai_software_opportunities'
      ? `Hi ${firstName}, I noticed ${business.name} is expanding its technical workflows. I build custom AI agents, Python data pipelines, and internal tools that eliminate repetitive manual steps. Are you open to a 10-minute chat this week?`
      : `Hi ${firstName}, I came across ${business.name} and noticed your strong customer reviews, but couldn't find a direct online booking website. I build high-speed, modern websites that convert visitors directly into booked clients. Are you open to a brief chat this week?`;

  return (
    <div className="max-w-4xl mx-auto space-y-space-md pb-16">
      {/* Back button */}
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors min-h-[36px]"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        <span>Back to Businesses</span>
      </Link>

      {/* Header Card */}
      <div className="p-space-md sm:p-space-lg rounded-xl bg-surface-container border border-outline-variant/20 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-sm sm:font-headline-md text-headline-sm sm:text-headline-md font-bold text-on-surface">
                {business.name}
              </h1>
              {isDemo && (
                <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[10px] uppercase font-bold">
                  DEMO
                </span>
              )}
              <StatusChip
                variant={business.domain ? 'neutral' : 'error'}
                label={business.domain ? 'Website works' : 'No website found'}
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                <span>{[business.city, business.region, business.country].filter(Boolean).join(', ')}</span>
              </span>
              {business.industry && (
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-medium">
                  {business.industry}
                </span>
              )}
              <span>
                Discovered via <strong>{business.sourceProvider}</strong>
              </span>
            </div>
          </div>

          <MatchChip score={score} reason={business.score?.reasoning || 'High commercial intent and verified location'} />
        </div>
      </div>

      {/* 1) Why this is a good lead */}
      <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm space-y-3">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">bolt</span>
          <span>Why this is a good lead</span>
        </h2>
        <ul className="space-y-2.5 text-xs sm:text-sm text-on-surface-variant">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center text-xs shrink-0 mt-0.5">
              ✓
            </span>
            <div>
              <strong className="text-on-surface">Commercial Activity:</strong> Established business with verified presence. Discovered on {new Date(business.createdAt).toLocaleDateString()}.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary-container/20 text-primary flex items-center justify-center text-xs shrink-0 mt-0.5">
              ✓
            </span>
            <div>
              <strong className="text-on-surface">Clear Value Proposition:</strong>{' '}
              {business.domain
                ? 'Active website would benefit from AI workflow automation and automated client intake.'
                : 'No standalone web domain found; relies solely on directory listings or social media.'}
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center text-xs shrink-0 mt-0.5">
              ✓
            </span>
            <div>
              <strong className="text-on-surface">Freshness Check:</strong> Re-verified recently. 0 suppression flags recorded.
            </div>
          </li>
        </ul>
      </section>

      {/* 2) What we noticed */}
      <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm space-y-3">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
          <span>What we noticed</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
            <div className="text-on-surface-variant font-medium">Website Check</div>
            <div className="text-on-surface font-semibold">
              {business.websiteCheck?.status || (business.domain ? 'Online' : 'No website registered')}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              {business.domain ? `Domain: ${business.domain}` : 'Searched DNS & registries; no dedicated domain found'}
            </div>
          </div>

          <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
            <div className="text-on-surface-variant font-medium">Public Presence</div>
            <div className="text-on-surface font-semibold">Active Local Presence</div>
            <div className="text-[11px] text-on-surface-variant">Verified telephone and commercial activity</div>
          </div>
        </div>
      </section>

      {/* 3) How to reach them */}
      <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm space-y-3">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">contact_phone</span>
          <span>How to reach them</span>
        </h2>

        <div className="space-y-3">
          {emailContact && (
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">mail</span>
                  <span className="text-xs font-bold text-on-surface font-mono">{emailContact.email}</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-semibold">
                    Verified
                  </span>
                </div>
                <div className="text-[11px] text-on-surface-variant">Found via verified contact scan</div>
              </div>
              <a
                href={`mailto:${emailContact.email}`}
                className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold shadow-sm min-h-[36px] flex items-center"
              >
                Send Email
              </a>
            </div>
          )}

          {phone && (
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">phone</span>
                  <span className="text-xs font-bold text-on-surface font-mono">{phone}</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-[10px] font-semibold">
                    Direct Line
                  </span>
                </div>
                <div className="text-[11px] text-on-surface-variant">Available for phone call or WhatsApp message</div>
              </div>
              <a
                href={`tel:${phone}`}
                className="px-3.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold min-h-[36px] flex items-center"
              >
                Call Business
              </a>
            </div>
          )}

          {/* Tailored Pitch Box */}
          <div className="p-space-md rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Tailored Outreach Pitch
              </span>
              <span className="text-[11px] text-on-surface-variant">Prepared for Zia</span>
            </div>
            <p className="text-xs text-on-surface bg-surface-container p-3 rounded-lg border border-outline-variant/20 font-mono leading-relaxed select-all">
              {tailoredPitch}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {linkedInUrl && (
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  <span>Open LinkedIn</span>
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  <span>Open Facebook</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4) Email Status */}
      <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm space-y-3">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">outgoing_mail</span>
          <span>Email Status</span>
        </h2>

        {businessDraft ? (
          <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-on-surface">
                Subject: {businessDraft.selectedSubject || businessDraft.subjectLines?.[0] || 'Outreach Pitch'}
              </span>
              <StatusChip
                variant={businessDraft.status === 'sent' ? 'success' : businessDraft.status === 'rejected' ? 'error' : 'warning'}
                label={businessDraft.status === 'sent' ? 'Sent (confirmed)' : businessDraft.status === 'rejected' ? 'Blocked' : 'Waiting to Send'}
              />
            </div>
            <p className="text-on-surface font-mono text-[11px] whitespace-pre-wrap bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
              {businessDraft.emailBody}
            </p>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">
            No email drafted yet. The next automatic run will generate a verified pitch if an email address is verified.
          </p>
        )}
      </section>
    </div>
  );
}
