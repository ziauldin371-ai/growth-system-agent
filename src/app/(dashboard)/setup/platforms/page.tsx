import { PlatformsRegistryView } from '@/components/platforms/platforms-registry-view';

export const metadata = {
  title: 'Platforms Registry | Growth System',
  description: 'Searchable registry of all 89 client acquisition platforms',
};

export default function SetupPlatformsPage() {
  return (
    <div className="flex flex-col gap-5 pb-12">
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-on-surface">Platforms Registry</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Browse, filter, and manage all 89 client acquisition platforms across Marketplaces, Vetted Networks, and Lead Databases.
          </p>
        </div>
      </div>
      <PlatformsRegistryView />
    </div>
  );
}
