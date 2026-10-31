import { PlatformsRegistryView } from '@/components/platforms/platforms-registry-view';

export const metadata = {
  title: 'Client Acquisition Platforms | Growth System',
  description: '89 AI/ML Client Acquisition Platforms Registry',
};

export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-5 pb-12">
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-on-surface">Client Acquisition Platforms</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Data-driven registry of 89 client-work, talent network, and prospecting platforms with terms verification and per-platform outreach.
          </p>
        </div>
      </div>
      <PlatformsRegistryView />
    </div>
  );
}
