import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'MediSafe',
  description:
    'A hackathon-winning medication tracker that warns users about negative drug interactions across their prescriptions.',
  path: '/projects/medisafe',
});

export default function MediSafeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
