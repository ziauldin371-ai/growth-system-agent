'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-context';
import { PLAYBOOK_ICP_NICHES } from '@/services/discovery/icp-niches';
import { ICPNicheEntity } from '@/types';

interface LeadSourceStatus {
  id: string;
  name: string;
  category: string;
  isConfigured: boolean;
  healthStatus: 'healthy' | 'degraded' | 'not_configured' | 'rate_limited';
  monthlyBudget: number;
  creditsUsed: number;
}

export function LeadSourcesView() {
  const { success, error: toastError } = useToast();
  const [sources, setSources] = useState<LeadSourceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  // ICP Niche State
  const [niches, setNiches] = useState<ICPNicheEntity[]>(PLAYBOOK_ICP_NICHES);
  const [activeNicheId, setActiveNicheId] = useState('niche_saas_rag');

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('Clutch');
  const [companyCol, setCompanyCol] = useState('Company');
  const [domainCol, setDomainCol] = useState('Website');
  const [nameCol, setNameCol] = useState('Contact Name');
  const [emailCol, setEmailCol] = useState('Email');
  const [linkedinCol, setLinkedinCol] = useState('LinkedIn');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Paste Importer State
  const [pasteText, setPasteText] = useState('');
  const [pasteSource, setPasteSource] = useState('LinkedIn Sales Navigator');
  const [isPasting, setIsPasting] = useState(false);

  // External Email Tool CSV Export
  const [isExporting, setIsExporting] = useState(false);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platforms/lead-sources');
      const data = await res.json();
      if (data.success && Array.isArray(data.sources)) {
        setSources(data.sources);
      }
    } catch {
      toastError('Could not load lead source adapters.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleTestConnection = async (sourceId: string) => {
    setTestingId(sourceId);
    try {
      const res = await fetch('/api/platforms/lead-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, action: 'test_connection' }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.isConfigured) {
          success(data.message);
        } else {
          toastError(data.message);
        }
        fetchSources();
      }
    } catch {
      toastError('Test connection request failed.');
    } finally {
      setTestingId(null);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      toastError('Please paste valid CSV content.');
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch('/api/platforms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'csv',
          csvContent,
          sourcePlatform,
          mapping: {
            companyColumn: companyCol,
            domainColumn: domainCol,
            nameColumn: nameCol,
            emailColumn: emailCol,
            linkedinColumn: linkedinCol,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setImportResult(data.result);
        success(`Imported ${data.result.importedCount} leads! (${data.result.duplicateCount} duplicates skipped)`);
        setCsvContent('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) {
      toastError('Please paste company profile, URL or contact text.');
      return;
    }
    setIsPasting(true);
    try {
      const res = await fetch('/api/platforms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'paste',
          rawText: pasteText,
          sourcePlatform: pasteSource,
        }),
      });
      const data = await res.json();
      if (data.success && data.result?.importedCount > 0) {
        success(`Lead extracted and saved from ${pasteSource}!`);
        setPasteText('');
      } else {
        throw new Error(data.result?.errors?.[0] || 'Could not extract lead');
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsPasting(false);
    }
  };

  const handleDownloadSendingCsv = () => {
    setIsExporting(true);
    window.location.href = '/api/platforms/export-sending-csv';
    setTimeout(() => {
      setIsExporting(false);
      success('Export initiated for Instantly / Smartlead / Lemlist!');
    }, 1500);
  };

  const activeNiche = niches.find(n => n.id === activeNicheId) || niches[0];

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-base sm:text-lg font-bold text-on-surface">Lead Sources &amp; Research Adapters</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Configure official B2B data providers, track monthly API credit usage, and import research lists from directories.
        </p>
      </div>

      {/* 1. Official API Adapters Section (Red/Amber/Green) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">api</span>
            <span>Official Lead Source Adapters (Group C)</span>
          </h2>
          <span className="text-[11px] text-on-surface-variant">Live API Connections</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {sources.map((s) => {
            const isGreen = s.healthStatus === 'healthy';
            const isAmber = s.healthStatus === 'rate_limited';
            const isRed = s.healthStatus === 'not_configured';

            return (
              <div
                key={s.id}
                className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-on-surface truncate">{s.name.split('(')[0]}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isGreen ? 'bg-secondary/20 text-secondary' : isAmber ? 'bg-amber-500/20 text-amber-500' : 'bg-surface-container-high text-outline'
                    }`}>
                      {isGreen ? 'Active' : isAmber ? 'Budget Limit' : 'Awaiting Key'}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant">
                    {s.id === 'hunter' && 'Domain email search & verified MX testing.'}
                    {s.id === 'apollo' && 'Founder & CTO decision-maker discovery.'}
                    {s.id === 'snov' && 'B2B contact extraction and verification.'}
                    {s.id === 'crunchbase' && 'Funding rounds and company technology intel.'}
                  </p>

                  {/* Credit Usage Progress */}
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-on-surface-variant">
                      <span>Monthly Usage</span>
                      <span className="font-mono font-semibold">{s.creditsUsed} / {s.monthlyBudget} credits</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-lowest overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isAmber ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (s.creditsUsed / s.monthlyBudget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    ENV: {s.id.toUpperCase()}_API_KEY
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection(s.id)}
                    disabled={testingId === s.id}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant text-[11px] font-bold text-primary transition-colors flex items-center gap-1"
                  >
                    {testingId === s.id ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[12px]">refresh</span>
                    )}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Playbook ICP Buyer Niche Selector */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">target</span>
            <h2 className="text-sm sm:text-base font-bold text-on-surface">Target Buyer Niche &amp; Productized Offer</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Pick one buyer niche at a time (from the AI-ML Outreach Playbook). Pitch outcomes with verifiable proofs, never vague labels.
          </p>
        </div>

        {/* Niche Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {niches.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveNicheId(n.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeNicheId === n.id
                  ? 'bg-primary-container text-on-primary-container border-primary/40 shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
              }`}
            >
              {n.title}
            </button>
          ))}
        </div>

        {/* Selected Niche Dossier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs">
          <div className="flex flex-col gap-2.5">
            <div>
              <span className="font-bold text-on-surface">Target Buyer Roles:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {activeNiche.targetRoles.map((role) => (
                  <span key={role} className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-medium text-on-surface">
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="font-bold text-on-surface">Trigger Buying Signals to Look For:</span>
              <ul className="list-disc list-inside space-y-1 mt-1 text-on-surface-variant text-[11px]">
                {activeNiche.triggerSignals.map((sig, idx) => (
                  <li key={idx}>{sig}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-t md:border-t-0 md:border-l md:pl-4 border-outline-variant/20">
            <div>
              <span className="font-bold text-primary">Concrete Outcome Offer:</span>
              <p className="font-semibold text-on-surface mt-0.5 text-xs">{activeNiche.defaultOffer}</p>
            </div>

            <div>
              <span className="font-bold text-on-surface">Sample Scope:</span>
              <p className="text-on-surface-variant mt-0.5 leading-relaxed text-[11px]">{activeNiche.sampleScope}</p>
            </div>

            <div className="p-2 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-between">
              <span className="font-bold text-on-surface text-[11px]">Proof-of-Concept Price:</span>
              <span className="font-mono font-bold text-primary text-xs">{activeNiche.typicalPriceRange}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CSV Import Wizard & Paste Text Importer */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CSV Import Wizard */}
        <div className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col gap-3.5">
          <div>
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
              <span>CSV Lead Import Wizard</span>
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Import accounts from Clutch, G2, BuiltWith, Apollo or Sales Navigator CSVs. Deduplicated &amp; verified automatically.
            </p>
          </div>

          <form onSubmit={handleImportCsv} className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-on-surface">Source Directory / Tool</label>
              <select
                value={sourcePlatform}
                onChange={(e) => setSourcePlatform(e.target.value)}
                className="h-9 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30"
              >
                <option value="Clutch">Clutch.co Export</option>
                <option value="GoodFirms">GoodFirms Directory</option>
                <option value="G2">G2 Review Directory</option>
                <option value="BuiltWith">BuiltWith Tech Intelligence</option>
                <option value="Wappalyzer">Wappalyzer Lead List</option>
                <option value="Apollo CSV">Apollo.io CSV</option>
                <option value="Clay">Clay Enrichment Export</option>
                <option value="Sales Navigator">LinkedIn Sales Navigator CSV</option>
              </select>
            </div>

            {/* Column Mapping Inputs */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex flex-col gap-0.5">
                <label className="text-on-surface-variant font-medium">Company Column *</label>
                <input
                  type="text"
                  value={companyCol}
                  onChange={(e) => setCompanyCol(e.target.value)}
                  className="h-8 px-2 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-on-surface-variant font-medium">Website/Domain Column</label>
                <input
                  type="text"
                  value={domainCol}
                  onChange={(e) => setDomainCol(e.target.value)}
                  className="h-8 px-2 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-on-surface-variant font-medium">Email Column</label>
                <input
                  type="text"
                  value={emailCol}
                  onChange={(e) => setEmailCol(e.target.value)}
                  className="h-8 px-2 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-on-surface-variant font-medium">LinkedIn URL Column</label>
                <input
                  type="text"
                  value={linkedinCol}
                  onChange={(e) => setLinkedinCol(e.target.value)}
                  className="h-8 px-2 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-on-surface">Paste CSV Content</label>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Company,Website,Email,LinkedIn&#10;Acme Corp,acme.com,cto@acme.com,https://linkedin.com/in/john"
                rows={4}
                className="w-full p-2.5 rounded-xl bg-surface-container-lowest text-[11px] font-mono text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isImporting || !csvContent.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isImporting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Processing CSV...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">file_upload</span>
                  <span>Import Verified Leads</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick Paste Importer & External Sending Tool CSV Export */}
        <div className="flex flex-col gap-5">
          {/* Quick Paste Form */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">content_paste</span>
                <span>Paste Company Profile or URL</span>
              </h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Quick-add a single lead by pasting their website, LinkedIn profile, or email.
              </p>
            </div>

            <form onSubmit={handleImportPaste} className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-on-surface-variant font-medium">Source:</span>
                <select
                  value={pasteSource}
                  onChange={(e) => setPasteSource(e.target.value)}
                  className="h-8 px-2 rounded bg-surface-container-lowest text-[11px] text-on-surface border border-outline-variant/30"
                >
                  <option value="LinkedIn Sales Navigator">LinkedIn Sales Navigator</option>
                  <option value="Clutch Profile">Clutch Profile Page</option>
                  <option value="Product Hunt Post">Product Hunt Post</option>
                  <option value="YC Directory">Y Combinator Directory</option>
                  <option value="Direct Web Research">Direct Web Research</option>
                </select>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste company domain (e.g. https://retellai.com/), executive email (founder@company.com), or public text..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-surface-container-lowest text-[11px] text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
              ></textarea>

              <button
                type="submit"
                disabled={isPasting || !pasteText.trim()}
                className="w-full py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-xs font-bold text-on-surface transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPasting ? 'Extracting Lead...' : 'Add Lead to Pipeline'}
              </button>
            </form>
          </div>

          {/* External Sending Tool Note & Export */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">send_and_archive</span>
                <h3 className="font-bold text-xs text-on-surface">External Email Sending Tools (Instantly / Smartlead / Lemlist)</h3>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                <strong>Important distinction:</strong> Instantly, Smartlead, and Lemlist are email-sending sequences, <em>not</em> lead discovery sources. The system sends through the Gmail API with built-in safeguards. If you wish to dispatch sequences through an external cold email tool manually, export your approved leads below.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSendingCsv}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-xs font-bold text-primary flex items-center justify-center gap-1.5 border border-outline-variant/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>{isExporting ? 'Preparing CSV Export...' : 'Download Approved Leads CSV for External Tools'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
