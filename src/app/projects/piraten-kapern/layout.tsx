import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Piraten Kapern',
  description:
    'A Java implementation of the dice-and-card pirate game Piraten Kapern, with full rules and scoring.',
  path: '/projects/piraten-kapern',
});

export default function PiratenKapernLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
