import { LeadSourcesView } from '@/components/platforms/lead-sources-view';

export const metadata = {
  title: 'Lead Sources & Budgets | Growth System',
  description: 'Manage lead source integrations, credit budgets, and CSV imports',
};

export default function SetupLeadSourcesPage() {
  return (
    <div className="flex flex-col gap-5 pb-12">
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-on-surface">Lead Sources &amp; Credit Budgets</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Group C prospecting adapters (Apollo, Hunter, Snov, Crunchbase), CSV column mapping, and buyer niche selectors.
          </p>
        </div>
      </div>
      <LeadSourcesView />
    </div>
  );
}

