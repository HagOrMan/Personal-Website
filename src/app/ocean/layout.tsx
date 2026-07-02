import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ocean',
  description: 'A page to admire the ocean view',
};

export default function OceanLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
