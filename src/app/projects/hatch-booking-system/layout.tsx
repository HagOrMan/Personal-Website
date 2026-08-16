import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Hatch Booking System',
  description:
    'A booking system built in the McMaster Engineering Society to book Engineering study rooms.',
  path: '/projects/hatch-booking-system',
});

export default function HatchBookingSystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
