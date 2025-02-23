import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects - Island Builder',
  description:
    'A Java project which generated islands and cities on those islands.',
};

export default function IslandBuilderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
