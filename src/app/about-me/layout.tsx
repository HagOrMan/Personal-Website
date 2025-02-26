import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Me',
  description: 'A deep dive into my background, skills, and passion.',
};

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
