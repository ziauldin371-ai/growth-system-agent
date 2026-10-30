'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';

type ManualFilter = 'all' | 'call' | 'whatsapp' | 'instagram';

function ContactManuallyContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const initialDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [showDemo, setShowDemo] = useState(initialDemo);
  const [filter, setFilter] = useState<ManualFilter>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());
  const [reminders, setReminders] = useState<{ [id: string]: string }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isScriptExpanded, setIsScriptExpanded] = useState(true);

  // Daily target (e.g. 5 calls/DMs target)
  const dailyTarget = 5;
  const completedCount = contactedIds.size;
  const progressPct = Math.min(100, Math.round((completedCount / dailyTarget) * 100));

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
        const filteredList = list.filter((b: any) => (showDemo ? true : !isDemoRecord(b)));
        setBusinesses(filteredList);
        if (filteredList.length > 0) {
          setSelectedLead((prev: any) => prev || filteredList[0]);
        }
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

  const copyToClipboard = async (text: string, key: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 3000);
    } catch {
      toastError('Could not copy to clipboard. Please copy manually.');
    }
  };

  const handleMarkContacted = (id: string) => {
    setContactedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    success('Contact status updated!');
  };

  const handleSetReminder = (id: string, when: string) => {
    setReminders((prev) => ({ ...prev, [id]: when }));
    success(`Reminder set for: ${when}`);
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

  const getPhone = (b: any) => b?.phone || b?.phoneNumber || b?.contacts?.find((c: any) => c.phone)?.phone;

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Demo Notice */}
      {showDemo && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-3 text-tertiary shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <div>
              <span className="font-label-lg font-bold">Demo data is shown</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Simulated contacts for previewing manual outreach.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDemo(false)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* Daily Target Progress Bar & Header */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-on-surface">
                Contact Manually (Calls &amp; Social)
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold">
                Direct Channel
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Verified businesses without public email. Ready for phone calls, WhatsApp, or Instagram DMs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
            <span className="text-secondary">{completedCount}</span> of <span>{dailyTarget} calls/DMs today</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
          <div
            className="h-full bg-secondary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>

        {/* Compliance Guard Notice */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary shrink-0">shield</span>
          <span>
            <strong>Compliance Notice:</strong> Check do-not-call rules before phoning. All calls and social messages are initiated manually by you.
          </span>
        </div>
      </section>

      {/* 30-Second Phone Script Quick Access Card */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsScriptExpanded(!isScriptExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container-high/40 transition-colors min-h-[48px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">phone_in_talk</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm text-on-surface font-semibold block truncate">
                Your 30-Second Phone Script (Proven Template)
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Natural, conversational script to convert local business leads into clients
              </span>
            </div>
          </div>
          <span
            className={`material-symbols-outlined text-outline text-[20px] transition-transform duration-200 ${
              isScriptExpanded ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </button>

        {isScriptExpanded && (
          <div className="p-4 pt-0 space-y-3 border-t border-outline-variant/10">
            <div className="p-3.5 rounded-xl bg-surface-container-low text-on-surface text-xs sm:text-sm leading-relaxed italic border border-outline-variant/20">
              &ldquo;Hi! I noticed your listing on Google Maps doesn&apos;t have a modern mobile website. I built a quick 2-page preview for you—can I send it to your WhatsApp or email?&rdquo;
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = "Hi! I noticed your listing on Google Maps doesn't have a modern mobile website. I built a quick 2-page preview for you—can I send it to your WhatsApp or email?";
                  copyToClipboard(text, 'masterScript', 'Script');
                }}
                className="py-2 px-3.5 bg-primary-container hover:bg-primary-container/80 text-on-primary-container font-semibold text-xs rounded-xl flex items-center gap-1.5 active:opacity-90 transition-all min-h-[44px]"
                aria-label="Copy Script to Clipboard"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedKey === 'masterScript' ? 'check' : 'content_copy'}
                </span>
                <span>{copiedKey === 'masterScript' ? 'Script Copied!' : 'Copy Script to Clipboard'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Pane Workspace on Laptop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: Priority Leads List */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Channel Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
                filter === 'all'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({businesses.length})
            </button>
            <button
              onClick={() => setFilter('call')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
                filter === 'call'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Phone Ready
            </button>
            <button
              onClick={() => setFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
                filter === 'whatsapp'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setFilter('instagram')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
                filter === 'instagram'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Instagram
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              Loading verified priority leads...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl p-8 bg-surface-container border border-outline-variant/20 text-center text-xs text-on-surface-variant">
              No leads match this channel filter.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((b) => {
                const isSelected = selectedLead?.id === b.id;
                const isContacted = contactedIds.has(b.id);
                const phone = getPhone(b);
                const score = b.score?.overall || 85;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedLead(b);
                      setShowMobileSheet(true);
                    }}
                    className={`p-3.5 rounded-2xl bg-surface-container border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary shadow-md'
                        : 'border-outline-variant/20 hover:border-outline-variant/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-on-surface truncate">{b.name}</h3>
                          {isContacted && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
                              Contacted
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-on-surface-variant truncate block">
                          {[b.city, b.industry].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0">{score}%</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-outline-variant/20 text-xs">
                      <span className="font-mono text-on-surface-variant truncate">
                        {phone || 'Social contact only'}
                      </span>
                      <span className="text-[11px] text-primary font-semibold">Select →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Selected Lead Control Center (Desktop) */}
        <aside className="hidden lg:flex lg:col-span-7 flex-col gap-4 bg-surface-container p-5 rounded-2xl border border-outline-variant/20 lg:sticky lg:top-20">
          {selectedLead ? (
            <div className="flex flex-col gap-4">
              {/* Lead Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant/20">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Active Workspace</span>
                  <h2 className="text-lg font-bold text-on-surface mt-0.5">{selectedLead.name}</h2>
                  <p className="text-xs text-on-surface-variant">
                    {[selectedLead.city, selectedLead.industry].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkContacted(selectedLead.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 ${
                      contactedIds.has(selectedLead.id)
                        ? 'bg-emerald-950 text-emerald-200 border border-emerald-500/40'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {contactedIds.has(selectedLead.id) ? 'check_circle' : 'done'}
                    </span>
                    <span>{contactedIds.has(selectedLead.id) ? 'Contacted' : 'Mark Contacted'}</span>
                  </button>
                </div>
              </div>

              {/* 30-Second Phone Script Box */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    <span>30-Second Phone Script</span>
                  </div>
                  <button
                    onClick={() => {
                      const text = `Hi, is this ${selectedLead.name}? My name is Zia, I run a local web consultancy. I noticed your profile doesn't have an active mobile website link, and I built a quick 2-page preview that helps capture customer quotes. Can I send it to your WhatsApp or email?`;
                      copyToClipboard(text, 'phoneScript', 'Phone script');
                    }}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'phoneScript' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedKey === 'phoneScript' ? 'Copied' : 'Copy Script'}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-on-surface leading-relaxed italic">
                  &ldquo;Hi, is this {selectedLead.name}? My name is Zia, I run a local web consultancy. I noticed your profile doesn&apos;t have an active mobile website link, and I built a quick 2-page preview that helps capture customer quotes. Can I send it to your WhatsApp or email?&rdquo;
                </p>
              </div>

              {/* Channels: Phone, WhatsApp, Instagram */}
              <div className="flex flex-col gap-3">
                {/* Phone Channel */}
                {getPhone(selectedLead) && (
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[20px]">phone</span>
                      <div>
                        <span className="text-xs font-semibold text-on-surface-variant block">Phone Number</span>
                        <span className="font-mono text-xs sm:text-sm text-on-surface font-bold">
                          {getPhone(selectedLead)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(getPhone(selectedLead), 'phone', 'Phone number')}
                        className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Copy Phone"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                      <a
                        href={`tel:${getPhone(selectedLead)}`}
                        className="px-3.5 py-1.5 rounded-lg bg-secondary text-white text-xs font-bold flex items-center gap-1 min-h-[36px]"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* WhatsApp Channel */}
                {getPhone(selectedLead) && (
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-emerald-400 text-[20px]">chat</span>
                      <div>
                        <span className="text-xs font-semibold text-on-surface-variant block">WhatsApp Pitch</span>
                        <span className="text-xs text-on-surface">One-click message with link</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${getPhone(selectedLead).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hi ${selectedLead.name}, I built a quick 2-page preview website for your business. Can I send the link here?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 min-h-[36px]"
                      >
                        <span>Open WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Set Reminder */}
              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2 text-xs">
                <span className="text-on-surface-variant font-medium">Follow-up Reminder:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSetReminder(selectedLead.id, 'Tomorrow')}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs"
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => handleSetReminder(selectedLead.id, '3 Days')}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs"
                  >
                    3 Days
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              Select a lead on the left to view the phone script and outreach options.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile Selected Lead Sheet (< 1024px) */}
      {showMobileSheet && selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end lg:hidden"
          onClick={() => setShowMobileSheet(false)}
        >
          <div
            className="bg-surface-container rounded-t-2xl p-5 border-t border-outline-variant/30 space-y-4 max-h-[85vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div>
                <h3 className="text-base font-bold text-on-surface">{selectedLead.name}</h3>
                <span className="text-xs text-on-surface-variant">{selectedLead.city}</span>
              </div>
              <button
                onClick={() => setShowMobileSheet(false)}
                className="p-2 rounded-lg bg-surface-container-high text-on-surface min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {getPhone(selectedLead) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                <span className="font-mono text-sm font-bold text-on-surface">{getPhone(selectedLead)}</span>
                <a
                  href={`tel:${getPhone(selectedLead)}`}
                  className="px-4 py-2 rounded-lg bg-secondary text-white font-bold text-xs min-h-[44px] flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>Call Now</span>
                </a>
              </div>
            )}

            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface leading-relaxed italic">
              &ldquo;Hi, is this {selectedLead.name}? My name is Zia, I noticed your Google profile doesn&apos;t have a website link. I built a preview for you—can I send it to your WhatsApp?&rdquo;
            </div>

            <button
              onClick={() => {
                handleMarkContacted(selectedLead.id);
                setShowMobileSheet(false);
              }}
              className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary-container font-semibold text-xs min-h-[44px]"
            >
              {contactedIds.has(selectedLead.id) ? 'Marked as Contacted' : 'Mark as Contacted'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactManuallyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-on-surface-variant">
          Loading manual leads...
        </div>
      }
    >
      <ContactManuallyContent />
    </Suspense>
  );
}
