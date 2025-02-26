import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description: "See all the cool projects I've worked on!",
};

export default function ProjectsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
