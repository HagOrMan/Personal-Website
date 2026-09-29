import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Music',
  description:
    'Original compositions by Kyle Hagerman, with full scores, recordings, and the story behind each piece.',
  path: '/music',
});

export default function MusicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
