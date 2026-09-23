import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Terms',
  description:
    'Who owns the writing and photographs on this site, what you are welcome to do with them, and what the site does not promise.',
  path: '/terms',
});

export default function TermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
