import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Flappy Bird',
  description:
    'A Pygame take on Flappy Bird with hand-written jump physics, four playable birds, and a two-player duel mode.',
  path: '/projects/flappy-bird',
});

export default function FlappyBirdLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
