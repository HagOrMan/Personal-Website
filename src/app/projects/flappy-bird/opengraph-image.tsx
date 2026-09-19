import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'Flappy Bird';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'Flappy Bird',
    subtitle:
      'A Pygame clone with hand-written physics and a two-player duel mode.',
  });
}
