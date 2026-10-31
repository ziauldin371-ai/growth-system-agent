'use client';

import { useState } from 'react';
import { PlatformCategory, PlatformPitchMode, PlatformIntegrationMode, PlatformPriority, PlatformEntity } from '@/types';
import { useToast } from '@/components/ui/toast-context';

interface AddPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (platform: PlatformEntity) => void;
}

export function AddPlatformModal({ isOpen, onClose, onCreated }: AddPlatformModalProps) {
  const { success, error: toastError } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<PlatformCategory>('marketplace');
  const [pitchMode, setPitchMode] = useState<PlatformPitchMode>('proposal');
  const [integrationMode, setIntegrationMode] = useState<PlatformIntegrationMode>('manual_link');
  const [priority, setPriority] = useState<PlatformPriority>('Medium');
  const [howToGetClients, setHowToGetClients] = useState('');
  const [aiMlRelevance, setAiMlRelevance] = useState('');
  const [costAccessNotes, setCostAccessNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toastError('Platform name and website URL are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          category,
          pitchMode,
          integrationMode,
          priority,
          howToGetClients: howToGetClients.trim() || 'Browse opportunities and reach out',
          aiMlRelevance: aiMlRelevance.trim() || 'AI/ML software solutions',
          costAccessNotes: costAccessNotes.trim() || 'Verify current terms before use',
          countryEligibilityStatus: 'needs_check',
          myAccountStatus: 'none',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create platform');
      }

      success(`Platform "${data.platform.name}" registered successfully!`);
      onCreated(data.platform);
      onClose();
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-2xl w-full max-w-lg p-5 sm:p-6 overflow-hidden flex flex-col gap-4 max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
            <h2 className="text-base sm:text-lg font-bold text-on-surface">Add Platform to Registry</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Platform Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Contra, Kolabtree, Turing"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Official Website URL *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Job Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PlatformCategory)}
                className="w-full h-10 px-2.5 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
              >
                <option value="marketplace">Marketplace (Bidding)</option>
                <option value="vetted_network">Vetted Network (Matching)</option>
                <option value="expert_network">Expert Network</option>
                <option value="lead_database">Lead Database</option>
                <option value="contact_finder">Email Finder</option>
                <option value="company_intel">Company Intel</option>
                <option value="b2b_directory">B2B Directory</option>
                <option value="startup_community">Startup Community</option>
                <option value="social">Social Media</option>
                <option value="local_business_directory">Local Directory</option>
                <option value="job_feed">Job Feed</option>
                <option value="tender_portal">Tender Portal</option>
                <option value="email_sending_tool">Email Tool (Manual Export)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Pitch Mode</label>
              <select
                value={pitchMode}
                onChange={(e) => setPitchMode(e.target.value as PlatformPitchMode)}
                className="w-full h-10 px-2.5 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
              >
                <option value="proposal">Proposal (Marketplace)</option>
                <option value="application">Application (Network)</option>
                <option value="matching_only">Matching Only</option>
                <option value="connection_note">LinkedIn Note (&lt;300c)</option>
                <option value="direct_message">Direct Message (DM)</option>
                <option value="email">Direct Email</option>
                <option value="contact_form">Contact Form</option>
                <option value="comment_reply">Helpful Comment</option>
                <option value="research_only">Research Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlatformPriority)}
                className="w-full h-10 px-2.5 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">How to Get Clients</label>
            <input
              type="text"
              value={howToGetClients}
              onChange={(e) => setHowToGetClients(e.target.value)}
              placeholder="e.g. Browse posted RFPs or apply to verified developer projects"
              className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">AI/ML Relevance</label>
            <input
              type="text"
              value={aiMlRelevance}
              onChange={(e) => setAiMlRelevance(e.target.value)}
              placeholder="e.g. LLM integration, Python data models, RAG architecture"
              className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Cost &amp; Access Notes</label>
            <input
              type="text"
              value={costAccessNotes}
              onChange={(e) => setCostAccessNotes(e.target.value)}
              placeholder="e.g. Free registration; Connects fee per proposal"
              className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
            />
          </div>

          <p className="text-[11px] text-on-surface-variant italic">
            Note: All new platforms are registered with last_verified empty and flagged &ldquo;Verify current terms before use&rdquo;.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-xs font-semibold text-on-surface hover:bg-surface-variant"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Platform'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
