import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'DinoMind';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'DinoMind',
    subtitle:
      'A journaling app with a dino companion that reads your mood. Best Health Hack at DeltaHacks X.',
  });
}
