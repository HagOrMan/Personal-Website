import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'MonPoke',
  description: 'A fun game of catching MonPokes made with pygame.',
  path: '/projects/monpoke',
});

export default function MonPokeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
