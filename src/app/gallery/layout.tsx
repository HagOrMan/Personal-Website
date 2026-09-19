import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Gallery',
  description:
    'A wall of photos I have taken - travel, landscapes, and whatever else caught my eye.',
  path: '/gallery',
});

export default function GalleryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
