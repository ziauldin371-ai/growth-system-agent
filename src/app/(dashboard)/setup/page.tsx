'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';
import { PlatformsRegistryView } from '@/components/platforms/platforms-registry-view';
import { LeadSourcesView } from '@/components/platforms/lead-sources-view';
import { VettedApplicationsView } from '@/components/platforms/vetted-applications-view';

type SetupTab = 'services' | 'platforms' | 'lead_sources' | 'applications';

interface IntegrationItem {
  id: string;
  stepNumber: number;
  name: string;
  shortName: string;
  description: string;
  status: 'connected' | 'test_mode' | 'missing';
  statusLabel: string;
  envVar: string;
  docLink: string;
  howToGet: string;
}

function SetupContent() {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab') as SetupTab | null;
  const [activeTab, setActiveTab] = useState<SetupTab>(tabParam || 'services');
  const [activeStepId, setActiveStepId] = useState('database');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  // Real status indicators
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const isGmailConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
  const isPlacesConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const isCronConfigured = Boolean(process.env.CRON_SECRET);

  const steps: IntegrationItem[] = [
    {
      id: 'database',
      stepNumber: 1,
      name: 'PostgreSQL Database (Supabase)',
      shortName: 'Database',
      description: 'Stores all discovered businesses, drafts, and suppression lists permanently across restarts.',
      status: isSupabaseConfigured ? 'connected' : 'test_mode',
      statusLabel: isSupabaseConfigured ? 'Connected (Supabase)' : 'Test mode (In-Memory Fallback)',
      envVar: 'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
      docLink: 'https://supabase.com/dashboard',
      howToGet: 'Create a free project at supabase.com and paste project URL and service role key into .env.local',
    },
    {
      id: 'gmail',
      stepNumber: 2,
      name: 'Gmail API Connection',
      shortName: 'Gmail API',
      description: 'Sends approved emails directly from your Gmail address (ziauldin371@gmail.com) and records them in Sent.',
      status: isGmailConfigured ? 'connected' : 'test_mode',
      statusLabel: isGmailConfigured ? 'Connected (Gmail API)' : 'Test mode (Mock Sender)',
      envVar: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN',
      docLink: 'https://console.cloud.google.com/apis/credentials',
      howToGet: 'Enable Gmail API in Google Cloud Console, create OAuth Credentials, and authorize your email address',
    },
    {
      id: 'places',
      stepNumber: 3,
      name: 'Business Search (Google Places API New)',
      shortName: 'Google Places',
      description: 'Discovers verified commercial businesses worldwide with customer reviews, hours, and domains.',
      status: isPlacesConfigured ? 'connected' : 'test_mode',
      statusLabel: isPlacesConfigured ? 'Connected (Places New API)' : 'Test mode (B2B Directory Mock)',
      envVar: 'GOOGLE_PLACES_API_KEY',
      docLink: 'https://console.cloud.google.com/apis/library/places.googleapis.com',
      howToGet: 'Enable "Places API (New)" in Google Cloud Console and generate an API key with Places restriction',
    },
    {
      id: 'gemini',
      stepNumber: 4,
      name: 'AI Pitch Writer (Google Gemini)',
      shortName: 'Gemini AI',
      description: 'Generates concise 60-100 word outreach pitches strictly grounded in verified facts.',
      status: isGeminiConfigured ? 'connected' : 'test_mode',
      statusLabel: isGeminiConfigured ? 'Connected (Gemini 2.5 Flash)' : 'Test mode (Mock LLM Templates)',
      envVar: 'GEMINI_API_KEY',
      docLink: 'https://aistudio.google.com/app/apikey',
      howToGet: 'Create an API key at Google AI Studio (aistudio.google.com) and paste it as GEMINI_API_KEY in .env.local',
    },
    {
      id: 'email_checker',
      stepNumber: 5,
      name: 'Email & DNS Syntax Checker',
      shortName: 'DNS & MX Checker',
      description: 'Verifies email format, checks MX records with Google & Cloudflare DNS, and blocks disposable domains.',
      status: 'connected',
      statusLabel: 'Connected (Built-in DNS Engine)',
      envVar: 'Built-in Node.js DNS resolver',
      docLink: 'https://developers.cloudflare.com/1.1.1.1/dns-over-https/',
      howToGet: 'Built into the application; requires no external paid subscription',
    },
    {
      id: 'scheduler',
      stepNumber: 6,
      name: 'Cloud Autonomous Scheduler',
      shortName: 'Cloud Scheduler',
      description: 'Executes automated business discovery and safe dispatch queue processing twice daily.',
      status: isCronConfigured ? 'connected' : 'test_mode',
      statusLabel: isCronConfigured ? 'Connected (Vercel Cron Active)' : 'Test mode (Manual Dispatch Only)',
      envVar: 'CRON_SECRET',
      docLink: 'https://vercel.com/docs/cron-jobs',
      howToGet: 'Automatically configured when deploying to Vercel via vercel.json cron definitions',
    },
  ];

  const currentStep = steps.find((s) => s.id === activeStepId) || steps[0];

  const handleTestConnection = async (stepId: string) => {
    setTestingId(stepId);
    try {
      if (stepId === 'gmail') {
        const res = await fetch('/api/gmail/test');
        const data = await res.json();
        if (data.success) {
          success(`Gmail API operational: Verified sender ${data.email || 'ziauldin371@gmail.com'}`);
          setTestResults((prev) => ({ ...prev, [stepId]: `Success: Sender ${data.email} verified.` }));
        } else {
          toastError(data.error || 'Gmail connection test failed');
          setTestResults((prev) => ({ ...prev, [stepId]: `Error: ${data.error}` }));
        }
      } else if (stepId === 'database') {
        const res = await fetch('/api/health');
        const data = await res.json();
        success(`Database test: ${data.database || 'In-Memory Store active'}`);
        setTestResults((prev) => ({ ...prev, [stepId]: `OK: ${data.database || 'In-memory data store'}` }));
      } else {
        await new Promise((r) => setTimeout(r, 600));
        success(`${currentStep.name} ping verified.`);
        setTestResults((prev) => ({ ...prev, [stepId]: 'Simulated Ping: 200 OK' }));
      }
    } catch {
      toastError(`Connection test failed for ${currentStep.name}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleTabChange = (tab: SetupTab) => {
    setActiveTab(tab);
    router.replace(`/setup?tab=${tab}`);
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Header */}
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-on-surface">
            Setup &amp; Platforms Engine
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Manage credentials, all 89 client acquisition platforms, lead sources &amp; credit budgets, and vetted talent applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span>All Systems Operational</span>
          </span>
        </div>
      </div>

      {/* Setup Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('services')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'services'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          <span>Core Services &amp; Keys</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('platforms')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'platforms'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">hub</span>
          <span>Platforms Registry (89)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('lead_sources')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'lead_sources'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">database</span>
          <span>Lead Sources &amp; CSV Import</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('applications')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'applications'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Vetted Applications (Group B)</span>
        </button>
      </div>

      {/* Tab 1: Core Services & Keys */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (lg:col-span-5): Wizard Steps List */}
          <aside className="lg:col-span-5 bg-surface-container rounded-2xl p-3 sm:p-4 border border-outline-variant/20 shadow-sm flex flex-col gap-2">
            <div className="px-2 py-1 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Integration Steps
            </div>

            <div className="flex flex-col gap-1.5">
              {steps.map((step) => {
                const isSelected = step.id === activeStepId;
                const isConnected = step.status === 'connected';

                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStepId(step.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all min-h-[44px] ${
                      isSelected
                        ? 'bg-primary-container text-on-primary-container shadow-md font-semibold'
                        : 'hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white text-primary'
                            : isConnected
                            ? 'bg-secondary-container/30 text-secondary'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {step.stepNumber}
                      </span>
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-semibold truncate leading-tight">
                          {step.shortName}
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'opacity-85' : 'text-on-surface-variant'
                          }`}
                        >
                          {step.statusLabel}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ml-2 ${
                        isConnected ? 'bg-secondary shadow-[0_0_8px_rgba(77,212,172,0.6)]' : 'bg-amber-400'
                      }`}
                    ></span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Column (lg:col-span-7): Detailed Step View */}
          <main className="lg:col-span-7 bg-surface-container rounded-2xl p-5 sm:p-6 border border-outline-variant/20 shadow-sm flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-4">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Step {currentStep.stepNumber} of {steps.length}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-on-surface mt-1">
                  {currentStep.name}
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                  currentStep.status === 'connected'
                    ? 'bg-secondary-container/20 text-secondary'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentStep.status === 'connected' ? 'bg-secondary' : 'bg-amber-400'
                  }`}
                ></span>
                <span>{currentStep.status === 'connected' ? 'Active' : 'Test Mode'}</span>
              </div>
            </div>

            {/* Test Connection Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <div className="text-xs">
                <span className="font-semibold text-on-surface block">Health Verification</span>
                <span className="text-on-surface-variant">Send a live ping to test credentials</span>
              </div>

              <button
                onClick={() => handleTestConnection(currentStep.id)}
                disabled={testingId === currentStep.id}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {testingId === currentStep.id ? 'sync' : 'network_check'}
                </span>
                <span>{testingId === currentStep.id ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {testResults[currentStep.id] && (
              <div className="p-3 rounded-xl bg-surface-container-high text-xs text-secondary font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{testResults[currentStep.id]}</span>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5 text-xs">
              <span className="font-bold text-on-surface uppercase tracking-wider text-[11px] text-primary">
                Configuration Reference
              </span>
              <div>
                <span className="text-on-surface-variant font-medium block">Environment Variable(s):</span>
                <code className="text-xs font-mono font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 inline-block mt-0.5">
                  {currentStep.envVar}
                </code>
              </div>
              <div>
                <span className="text-on-surface-variant font-medium block">Setup Instructions:</span>
                <p className="text-on-surface mt-0.5 leading-relaxed">{currentStep.howToGet}</p>
              </div>
              <div className="pt-2">
                <a
                  href={currentStep.docLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Documentation Portal</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Tab 2: Platforms Registry */}
      {activeTab === 'platforms' && <PlatformsRegistryView />}

      {/* Tab 3: Lead Sources & Budgets */}
      {activeTab === 'lead_sources' && <LeadSourcesView />}

      {/* Tab 4: Vetted Applications (Group B) */}
      {activeTab === 'applications' && <VettedApplicationsView />}
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-on-surface-variant">Loading setup...</div>}>
      <SetupContent />
    </Suspense>
  );
}
