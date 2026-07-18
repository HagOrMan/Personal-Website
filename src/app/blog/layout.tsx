import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Thoughts, articles, and things I find interesting.',
  // Lets browsers and feed readers auto-discover the RSS feed from any
  // blog page (served by src/app/blog/feed.xml/route.ts).
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/blog/feed.xml', title: "Kyle's Corner — Blog" }],
    },
  },
};

export default function BlogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
