import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'About Me',
  description:
    'A deep dive into my background, skills, and passion, including some videos to get to know me better.',
  path: '/about-me',
});

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
