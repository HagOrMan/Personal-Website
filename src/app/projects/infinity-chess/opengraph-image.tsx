import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'Infinity Chess';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'Infinity Chess',
    subtitle:
      'A Chess variant where pieces can wrap around walls, going through one side and coming out the other.',
  });
}
