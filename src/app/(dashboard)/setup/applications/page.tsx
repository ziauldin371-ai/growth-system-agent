import { VettedApplicationsView } from '@/components/platforms/vetted-applications-view';

export const metadata = {
  title: 'Vetted Talent Applications | Growth System',
  description: 'Track applications, readiness scores, and Pakistan payout checks for talent networks',
};

export default function SetupApplicationsPage() {
  return (
    <div className="flex flex-col gap-5 pb-12">
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-on-surface">Vetted Network Applications</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Group B talent pools (Toptal, Arc, Lemon, Braintrust): profile readiness checklist and Pakistan practical payout verification.
          </p>
        </div>
      </div>
      <VettedApplicationsView />
    </div>
  );
}
