/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/leads', destination: '/businesses', permanent: false },
      { source: '/pipeline-a', destination: '/businesses?tab=no_website', permanent: false },
      { source: '/pipeline-b', destination: '/businesses?tab=needs_ai', permanent: false },
      { source: '/hot-opportunities', destination: '/businesses?tab=hot_requests', permanent: false },
      { source: '/sent-emails', destination: '/emails?tab=sent', permanent: false },
      { source: '/ready-for-email', destination: '/emails?tab=waiting', permanent: false },
      { source: '/approval-queue', destination: '/emails?tab=waiting', permanent: false },
      { source: '/no-email', destination: '/contact-manually', permanent: false },
      { source: '/other-channels', destination: '/contact-manually', permanent: false },
      { source: '/email-sent-plus-channels', destination: '/contact-manually', permanent: false },
      { source: '/campaigns', destination: '/run-and-schedule', permanent: false },
      { source: '/history', destination: '/run-and-schedule', permanent: false },
      { source: '/compliance', destination: '/safety', permanent: false },
      { source: '/deliverability', destination: '/safety', permanent: false },
      { source: '/settings', destination: '/setup', permanent: false },
    ];
  },
};

export default nextConfig;
