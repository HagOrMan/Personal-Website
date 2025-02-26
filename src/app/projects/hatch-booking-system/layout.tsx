import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects - Hatch Booking System',
  description:
    'A booking system built in the McMaster Engineering Society to book Engineering study rooms.',
};

export default function HatchBookingSystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
