import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'MES Website',
  description:
    'The McMaster Engineering Society website, remade from Wix into Next.js with new designs and pages for engineering students.',
  path: '/projects/mes-website',
});

export default function MesWebsiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
