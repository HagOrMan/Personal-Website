import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = 'Ocean sunrise scene';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'kylehagerman.dev',
    title: 'Ocean',
    subtitle: 'A full-screen page to admire the ocean view',
  });
}
