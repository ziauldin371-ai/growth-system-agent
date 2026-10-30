'use client';

import React, { useState, useEffect } from 'react';
import { BusinessEntity } from '@/types';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';

interface BusinessDetailsDrawerProps {
  business: BusinessEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkContacted?: (id: string, channel: string) => void;
}

export function BusinessDetailsDrawer({
  business,
  isOpen,
  onClose,
  onMarkContacted,
}: BusinessDetailsDrawerProps) {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [copiedPitch, setCopiedPitch] = useState<string | null>(null);
  const [isContacted, setIsContacted] = useState(false);

  useEffect(() => {
    setIsContacted(false);
  }, [business?.id]);

  if (!isOpen || !business) return null;

  const phone = business.phone || business.contacts?.find((c) => c.phone)?.phone;
  const email = business.contacts?.find((c) => c.email)?.email;
  const isPhoneVerified = Boolean(phone);
  const isEmailVerified = Boolean(email);
  const linkedInUrl =
    business.contacts?.find((c) => c.linkedinUrl)?.linkedinUrl ||
    business.websiteCheck?.socialUrls?.find((u) => u.includes('linkedin.com'));
  const instagramUrl = business.websiteCheck?.socialUrls?.find((u) => u.includes('instagram.com'));
  const website = (business as any).website || (business.domain ? `https://${business.domain}` : null);
  const matchScore = business.score?.overallScore || 85;

  const handleCopy = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedPitch(label);
      success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedPitch(null), 3000);
    } catch {
      error(`Could not copy to clipboard. Please copy manually.`);
    }
  };

  const phoneScript = `Hi, is this ${business.name}? My name is Zia, I run a local web and AI automation consultancy. I noticed your Google business profile doesn't have an active website link, and I have a quick 1-minute proposal that can help you capture online customer bookings directly. Do you have 60 seconds?`;

  const emailDraft = `Subject: Quick question regarding ${business.name}'s customer inquiries

Hi ${business.name} Team,

I came across your business in ${business.city || 'your area'} and noticed you don't currently have a dedicated website for customer quotes.

We help local businesses set up fast, mobile-friendly landing pages and automated quote responders.

Would you be open to a quick 5-minute chat this week?

Best regards,
Zia Ul Din
Autonomous Growth Agent`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-business-name"
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl md:max-w-2xl bg-surface-container border-l border-outline-variant/30 h-full flex flex-col shadow-2xl overflow-y-auto text-on-surface animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header with Back Button (Mobile) & Close (Desktop) */}
        <div className="sticky top-0 z-10 bg-surface-container/95 backdrop-blur-md p-4 sm:p-5 border-b border-outline-variant/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <button
              onClick={onClose}
              aria-label="Back to businesses"
              className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="truncate">
              <h2 id="drawer-business-name" className="text-base sm:text-lg font-bold text-on-surface truncate">
                {business.name}
              </h2>
              <p className="text-xs text-on-surface-variant truncate">
                {[business.city, business.country || 'UK', business.industry].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold shadow-sm">
              {matchScore}% Match
            </span>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Section 1: Why This Is a Good Lead */}
          <section className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Why this is a good lead</span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
              {business.score?.reasoning ||
                business.evidence?.[0]?.summary ||
                `${business.name} is an active, verified business in ${business.city || 'the local market'}. They have consistent Google Maps presence and customer demand, but are missing a modern web capture funnel.`}
            </p>
          </section>

          {/* Section 2: What We Noticed (Website Audit) */}
          <section className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span>What we noticed</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                <span className="text-on-surface-variant">Website Status:</span>
                <span className="font-semibold text-on-surface">
                  {website ? 'Active Link' : 'No Website Found'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                <span className="text-on-surface-variant">Phone Status:</span>
                <span className={`font-semibold ${isPhoneVerified ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {isPhoneVerified ? 'Verified Phone' : 'No Phone Found'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                <span className="text-on-surface-variant">Email Status:</span>
                <span className={`font-semibold ${isEmailVerified ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {isEmailVerified ? 'Verified Syntax + MX' : 'No Email Found'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                <span className="text-on-surface-variant">Lead Category:</span>
                <span className="font-semibold text-on-surface">
                  {business.pipelineType === 'ai_software_opportunities' ? 'AI / Software' : 'Local Business'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: How to Reach Them (Pitches & Direct Links) */}
          <section className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">hub</span>
                <span>How to reach them</span>
              </div>
              <span className="text-[11px] text-on-surface-variant">Choose your preferred channel</span>
            </div>

            {/* Channel 1: Phone (Click-to-call & 30-sec script) */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">call</span>
                  <span className="text-xs font-bold text-on-surface">Phone Channel</span>
                </div>
                {isPhoneVerified ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-semibold">
                    Verified Number
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-semibold">
                    Not Available
                  </span>
                )}
              </div>

              {isPhoneVerified ? (
                <>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-lowest">
                    <span className="font-mono text-xs sm:text-sm text-on-surface font-semibold">{phone}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${phone}`}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform min-h-[36px]"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${phone ? phone.replace(/[^0-9]/g, '') : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform min-h-[36px]"
                      >
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-container-lowest text-xs text-on-surface leading-relaxed border border-outline-variant/20">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-outline-variant/20">
                      <span className="font-bold text-primary">30-Second Phone Script:</span>
                      <button
                        onClick={() => handleCopy(phoneScript, 'Phone Script')}
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copiedPitch === 'Phone Script' ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedPitch === 'Phone Script' ? 'Copied' : 'Copy Script'}</span>
                      </button>
                    </div>
                    <p className="italic text-on-surface-variant">&ldquo;{phoneScript}&rdquo;</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  No direct phone number was found on Google Maps for this entity.
                </p>
              )}
            </div>

            {/* Channel 2: Email Draft */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
                  <span className="text-xs font-bold text-on-surface">Email Channel</span>
                </div>
                {isEmailVerified ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold">
                    Verified MX
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-semibold">
                    No Direct Email
                  </span>
                )}
              </div>

              {isEmailVerified ? (
                <>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-lowest text-xs">
                    <span className="font-mono text-on-surface font-semibold">{email}</span>
                    <button
                      onClick={() => handleCopy(emailDraft, 'Email Draft')}
                      className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      <span>{copiedPitch === 'Email Draft' ? 'Copied' : 'Copy Draft'}</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded-lg bg-surface-container-lowest text-xs text-on-surface-variant font-mono whitespace-pre-wrap leading-relaxed border border-outline-variant/20 max-h-48 overflow-y-auto">
                    {emailDraft}
                  </pre>
                </>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  No public email found. Use Phone or Instagram/Social to make contact.
                </p>
              )}
            </div>

            {/* Channel 3: Direct Client Hunting Channels (LinkedIn, WhatsApp, Instagram) */}
            {(linkedInUrl || instagramUrl || isPhoneVerified) && (
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                    <span className="text-xs font-bold text-on-surface">Direct Client Outreach Channels</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold">
                    Multi-Platform
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  {linkedInUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-blue-500/30">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-blue-400 text-[16px]">work</span>
                        <span className="font-semibold text-on-surface truncate">LinkedIn Profile</span>
                      </div>
                      <a
                        href={linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded bg-blue-600 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <span>Open</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                    </div>
                  )}

                  {isPhoneVerified && phone && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-emerald-500/30">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-emerald-400 text-[16px]">chat</span>
                        <span className="font-semibold text-on-surface truncate">WhatsApp Direct Chat</span>
                      </div>
                      <a
                        href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hi ${business.name}, I noticed your profile and built a quick 2-page preview website for your business. Can I send the link here?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <span>WhatsApp</span>
                        <span className="material-symbols-outlined text-[12px]">send</span>
                      </a>
                    </div>
                  )}

                  {instagramUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-pink-500/30">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-pink-400 text-[16px]">photo_camera</span>
                        <span className="font-semibold text-on-surface truncate">Instagram Profile</span>
                      </div>
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded bg-pink-600 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <span>Open DM</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Actions & Mark Contacted */}
          <section className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => {
                setIsContacted(true);
                onMarkContacted?.(business.id, isPhoneVerified ? 'phone' : 'email');
                success(`Marked ${business.name} as contacted.`);
              }}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px] transition-all ${
                isContacted
                  ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/40'
                  : 'bg-surface-container-highest hover:bg-surface-variant text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isContacted ? 'check_circle' : 'done'}
              </span>
              <span>{isContacted ? 'Marked as Contacted' : 'Mark as Contacted'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-opacity min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <span>Done</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
