import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Experience',
  description:
    'My work and volunteering experience, both technical and non-technical.',
};

export default function ExperienceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
