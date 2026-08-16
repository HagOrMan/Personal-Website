import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = 'Contact Kyle Hagerman';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'kylehagerman.dev',
    title: 'Contact',
    subtitle: "Contact me if you'd like to chat!",
  });
}
