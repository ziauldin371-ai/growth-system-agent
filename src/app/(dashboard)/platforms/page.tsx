import { PlatformsDirectoryView } from '@/components/platforms/platforms-directory-view';

export const metadata = {
  title: 'Find Clients on Platforms | Growth System',
  description: '68 verified platforms across 8 categories plus 7 local channels for manual client outreach',
};

export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-5 pb-12">
      <PlatformsDirectoryView />
    </div>
  );
}
