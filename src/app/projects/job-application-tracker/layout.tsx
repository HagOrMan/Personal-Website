import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Job Application Tracker',
  description:
    'A private job-search tracker: applications, event timelines, resume versions compiled from LaTeX, and reusable answers.',
  path: '/projects/job-application-tracker',
});

export default function JobApplicationTrackerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
