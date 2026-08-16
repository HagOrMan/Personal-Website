import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Infinity Chess',
  description:
    'A Chess variant where pieces can wrap around walls, going through one side and coming out the other.',
  path: '/projects/infinity-chess',
});

export default function InfinityChessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
