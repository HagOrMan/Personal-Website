import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects - Infinity Chess',
  description:
    'A Chess variant where pieces can wrap around walls, going through one side and coming out the other.',
};

export default function InfinityChessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
