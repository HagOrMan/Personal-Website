import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Finance Tracker',
  description:
    'A personal finance tracker for daily spending and group-purchase disbursements, with charts, reports and email digests.',
  path: '/projects/finance-tracker',
});

export default function FinanceTrackerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
