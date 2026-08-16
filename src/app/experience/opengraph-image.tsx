import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = "Kyle Hagerman's Experience";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'kylehagerman.dev',
    title: 'Experience',
    subtitle:
      'My work and volunteering experience, both technical and non-technical.',
  });
}
