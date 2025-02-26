import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects - MediSafe',
  description:
    'An medication tracker app for warning users of negative drug interactions in their medications.',
};

export default function MediSafeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
