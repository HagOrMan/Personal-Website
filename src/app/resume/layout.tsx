import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Resume',
  description:
    'Request access to my full resume, or browse my experience, projects, and skills right here on the site.',
  path: '/resume',
});

export default function ResumeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
