import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects - MonPoke',
  description: 'A fun game of catching MonPokes made with pygame.',
};

export default function MonPokeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
