import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = "Kyle's Corner — Blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Kyle's Corner",
    title: 'Blog',
    subtitle: 'Thoughts, educational tutorials, and things I find interesting.',
  });
}
