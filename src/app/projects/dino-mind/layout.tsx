import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'DinoMind',
  description:
    'A React Native journaling app whose dino companion summarizes your day, scores your mood, and plans tomorrow. Best Health Hack at DeltaHacks X.',
  path: '/projects/dino-mind',
});

export default function DinoMindLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
