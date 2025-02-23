import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects - Piraten Kapern',
  description: 'A Java game based on the game with the same name.',
};

export default function PiratenKapernLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
