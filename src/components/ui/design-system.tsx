'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  HelpCircle, 
  ArrowRight, 
  X, 
  Sparkles,
  ShieldCheck,
  Globe,
  Mail,
  Flame,
  Settings
} from 'lucide-react';
import { useLanguage } from '@/context/language-context';

/**
 * Consistent Status Chips across the application.
 * Never relies on color alone: combines an icon, a clear label, and accessible styling.
 */
export type StatusVariant = 
  | 'success' // Green
  | 'warning' // Amber
  | 'error'   // Red
  | 'neutral' // Slate
  | 'demo';   // Orange

interface StatusChipProps {
  variant: StatusVariant;
  label: string;
  tooltip?: string;
  className?: string;
}

export function StatusChip({ variant, label, tooltip, className = '' }: StatusChipProps) {
  const getStyle = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        };
      case 'error':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        };
      case 'demo':
        return {
          bg: 'bg-orange-500/20 border-orange-500/50 text-orange-200 font-bold',
          icon: <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
        };
      default:
        return {
          bg: 'bg-slate-800/80 border-slate-700 text-slate-300',
          icon: <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
        };
    }
  };

  const { bg, icon } = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bg} ${className}`}
      title={tooltip}
    >
      {icon}
      <span>{label}</span>
      {tooltip && (
        <span className="text-[10px] opacity-70 underline cursor-help ml-0.5" title={tooltip}>
          i
        </span>
      )}
    </span>
  );
}

/**
 * Match Rating Pill (replaces technical "Lead Score")
 */
export function MatchChip({ score, reason }: { score: number; reason?: string }) {
  let label = 'Weak Match';
  let variant: StatusVariant = 'neutral';

  if (score >= 80) {
    label = 'Excellent Match';
    variant = 'success';
  } else if (score >= 60) {
    label = 'Good Match';
    variant = 'warning';
  }

  return (
    <div className="flex items-center gap-1.5" title={reason || `Match confidence: ${score}/100`}>
      <StatusChip variant={variant} label={`${label} (${score})`} />
      {reason && <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-xs">{reason}</span>}
    </div>
  );
}

/**
 * Small information tooltip for technical jargon.
 */
export function InfoTooltip({ term, explanation }: { term: string; explanation: string }) {
  return (
    <span className="inline-flex items-center gap-1 group relative cursor-help">
      <span className="border-b border-dotted border-slate-500 text-slate-300">{term}</span>
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
        i
      </span>
      <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 shadow-xl z-50">
        {explanation}
      </span>
    </span>
  );
}

/**
 * Clean Page Header with Question Title, One-line Subtitle, and Help Button.
 */
interface PageHeaderProps {
  title: string;
  subtitle: string;
  urduSubtitle?: string;
  helpContent: {
    titleEn: string;
    titleUr: string;
    pointsEn: string[];
    pointsUr: string[];
  };
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, urduSubtitle, helpContent, actions }: PageHeaderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <button
            onClick={() => setIsHelpOpen(true)}
            aria-label="Open Help Drawer"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Help / Roman Urdu guidance"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {language === 'ur' && urduSubtitle ? urduSubtitle : subtitle}
        </p>
      </div>

      {actions && <div className="flex items-center gap-3">{actions}</div>}

      {/* Slide-over Help Drawer */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {language === 'ur' ? helpContent.titleUr : helpContent.titleEn}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLanguage}
                  className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 hover:bg-slate-700"
                >
                  {language === 'en' ? 'Roman Urdu' : 'English'}
                </button>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                {language === 'ur'
                  ? 'Yeh guidance aap ko is screen ka maqsad aur agla step asan alfaz mein samjhati hai.'
                  : 'Plain-language guidance designed so any business owner understands what to do in seconds.'}
              </div>

              <ul className="space-y-3">
                {(language === 'ur' ? helpContent.pointsUr : helpContent.pointsEn).map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
              >
                {language === 'ur' ? 'Samajh aa gaya' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Friendly Empty State with primary action button.
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionText, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="py-16 px-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 max-w-xl mx-auto my-8 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-800 text-indigo-400 mx-auto flex items-center justify-center border border-slate-700/80">
        {icon || <Info className="w-6 h-6" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{description}</p>
      </div>
      {(actionText && (actionHref || onAction)) && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <span>{actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <span>{actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Guided First-Run Tour Modal
 */
export function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Growth System Agent',
      desc: 'Your autonomous pipeline that finds real businesses worldwide that need a website or AI automation, drafts expert pitches backed by verified facts, and sends them safely.',
      link: '/',
      linkText: 'Explore Home',
    },
    {
      title: 'Businesses Found',
      desc: 'See every discovered company organized by what they need: no website, website problems, or software requests. Every claim links to live evidence.',
      link: '/businesses',
      linkText: 'View Businesses',
    },
    {
      title: 'Emails & Gmail Confirmation',
      desc: 'Sent emails appear directly in your real Gmail Sent folder with real message IDs. If an email fails safety rules or syntax checks, it is safely blocked here.',
      link: '/emails',
      linkText: 'Check Emails',
    },
    {
      title: 'Setup & Traffic Lights',
      desc: 'Connect your Gmail account, Google Places key, and Gemini AI. Traffic lights clearly tell you when each tool is ready to use.',
      link: '/setup',
      linkText: 'Open Setup',
    },
  ];

  return {
    isOpen,
    openTour: () => {
      setStep(0);
      setIsOpen(true);
    },
    TourModal: isOpen ? (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Quick Tour • Step {step + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">{steps[step].title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{steps[step].desc}</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null,
  };
}
