import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy',
  description:
    'What this site collects, what it deliberately does not, and who else handles any of it.',
  path: '/privacy',
});

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
