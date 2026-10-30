'use client';

import React from 'react';
import Link from 'next/link';
import { BusinessEntity } from '@/types';
import { useLanguage } from '@/context/language-context';

interface BusinessCardProps {
  business: BusinessEntity;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const { t } = useLanguage();
  const isDemo = Boolean(business.isSandboxData || business.sourceProvider === 'b2b_mock');

  // Compute status
  const webStatus = business.websiteCheck?.status;
  const isNoWebsite = !business.domain || webStatus === 'apparently_absent' || webStatus === 'social_only';
  const isBroken = webStatus === 'parked' || webStatus === 'broken';
  const isNeedsAi = business.pipelineType === 'ai_software_opportunities';

  // Contact info
  const verifiedEmail = business.contacts?.find((c) => c.email)?.email;
  const phone = business.phone || business.contacts?.find((c) => c.phone)?.phone;
  const rating = (business as any).rating || (business.evidence?.[0]?.metadata as any)?.rating;
  const reviewCount = (business as any).reviewCount || (business.evidence?.[0]?.metadata as any)?.userRatingsTotal;

  // Opportunity text from evidence only (Honesty Rule 3)
  const oppSummary =
    business.evidence?.[0]?.summary ||
    business.score?.reasoning ||
    (isNoWebsite
      ? 'No active landing page found on Google Maps. Prime local search opportunity.'
      : isBroken
      ? 'Website returns errors or slow load times. Mobile fix opportunity.'
      : 'Active commercial business ready for direct modern engagement.');

  return (
    <article className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col space-y-space-sm relative overflow-hidden border border-outline-variant/20 hover:border-outline-variant/40 transition-all">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">
              {isNeedsAi ? 'smart_toy' : isNoWebsite ? 'domain_disabled' : 'storefront'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-sm text-headline-sm text-on-surface truncate font-bold">
                {business.name}
              </h2>
              {isDemo && (
                <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[10px] tracking-wider uppercase font-bold">
                  DEMO
                </span>
              )}
            </div>
            <p className="font-label-md text-xs sm:text-sm text-on-surface-variant flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              <span>
                {[business.industry, business.city, business.country].filter(Boolean).join(' • ')}
              </span>
            </p>
          </div>
        </div>

        <Link
          href={`/businesses/${business.id}`}
          className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface-variant flex items-center justify-center shrink-0 transition-colors"
          title="View Business Details"
          aria-label={`View details for ${business.name}`}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>

      {/* Problem & Opportunity Insight Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {isNoWebsite ? (
          <span className="px-2.5 py-1 rounded-full bg-error-container/30 text-error font-label-md text-xs flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            No Website Found
          </span>
        ) : isBroken ? (
          <span className="px-2.5 py-1 rounded-full bg-tertiary-container/30 text-tertiary font-label-md text-xs flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">speed</span>
            Website Has Problems
          </span>
        ) : isNeedsAi ? (
          <span className="px-2.5 py-1 rounded-full bg-primary-container/20 text-primary font-label-md text-xs flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">smart_toy</span>
            Needs AI / Software
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary font-label-md text-xs flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Website Online
          </span>
        )}

        {rating && (
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-tertiary">star</span>
            <span>
              {rating}★ {reviewCount ? `(${reviewCount} Reviews)` : ''}
            </span>
          </span>
        )}
      </div>

      {/* Opportunity Callout Box */}
      <div className="bg-surface-container-low rounded-lg p-space-sm">
        <p className="font-body-md text-xs sm:text-sm text-on-surface leading-relaxed">
          <span className="font-semibold text-primary">Opportunity: </span>
          {oppSummary}
        </p>
      </div>

      {/* Contact Verification */}
      {verifiedEmail ? (
        <div className="flex items-center gap-1.5 px-space-xs py-1 rounded bg-secondary-container/20 text-secondary font-label-md text-xs">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>
            Verified Email: <strong className="text-on-surface font-mono">{verifiedEmail}</strong>
          </span>
        </div>
      ) : phone ? (
        <div className="flex items-center gap-1.5 px-space-xs py-1 rounded bg-surface-container-high text-on-surface-variant font-label-md text-xs">
          <span className="material-symbols-outlined text-[16px] text-primary">phone</span>
          <span>
            Verified Phone: <strong className="text-on-surface font-mono">{phone}</strong> (No email found)
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-space-xs py-1 rounded bg-surface-container-high text-on-surface-variant font-label-md text-xs">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>Direct search lead (requires manual review before contact)</span>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-1">
        {verifiedEmail ? (
          <Link
            href={`/businesses/${business.id}`}
            className="w-full min-h-[44px] py-2 px-space-md rounded-lg bg-primary-container text-on-primary-container font-label-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(91,91,240,0.35)] active:opacity-90 font-semibold transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            <span>Send Intro Website Offer</span>
            <span className="material-symbols-outlined text-[16px] ml-auto">arrow_forward</span>
          </Link>
        ) : phone ? (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${phone}`}
              className="min-h-[44px] py-2 px-space-md rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 active:opacity-90 font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span>Tap to Call</span>
            </a>
            <Link
              href={`/businesses/${business.id}`}
              className="min-h-[44px] py-2 px-space-md rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 font-semibold"
            >
              <span>View Details</span>
            </Link>
          </div>
        ) : (
          <Link
            href={`/businesses/${business.id}`}
            className="w-full min-h-[44px] py-2 px-space-md rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 font-semibold"
          >
            <span>{t('action.view_details', 'View details')}</span>
            <span className="material-symbols-outlined text-[16px] ml-auto">arrow_forward</span>
          </Link>
        )}
      </div>
    </article>
  );
}
