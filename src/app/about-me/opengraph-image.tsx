import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = 'About Kyle Hagerman';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Kyle's Corner",
    title: 'About Me',
    subtitle: 'My background, skills, and what I enjoy building.',
  });
}
