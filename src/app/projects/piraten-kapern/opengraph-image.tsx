import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'Piraten Kapern';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'Piraten Kapern',
    subtitle:
      'A Java implementation of the dice-and-card pirate game Piraten Kapern.',
  });
}
