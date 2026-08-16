import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

const base = pageMetadata({
  title: 'Blog',
  description:
    'Thoughts, educational tutorials, and things I find interesting.',
  path: '/blog',
});

export const metadata: Metadata = {
  ...base,
  // Lets browsers and feed readers auto-discover the RSS feed from any
  // blog page (served by src/app/blog/feed.xml/route.ts).
  alternates: {
    ...base.alternates,
    types: {
      'application/rss+xml': [
        { url: '/blog/feed.xml', title: "Kyle's Corner — Blog" },
      ],
    },
  },
};

export default function BlogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
