import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Experience',
  description:
    'My work and volunteering experience, both technical and non-technical.',
  path: '/experience',
});

export default function ExperienceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
