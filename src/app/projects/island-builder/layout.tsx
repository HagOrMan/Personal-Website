import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Island Builder',
  description:
    'A Java project that procedurally generates islands with distinct biomes, then places and connects cities across the terrain.',
  path: '/projects/island-builder',
});

export default function IslandBuilderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
