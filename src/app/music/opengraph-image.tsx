import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = 'Music by Kyle Hagerman';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Kyle's Corner",
    title: 'Music',
    subtitle: 'Original compositions: scores, recordings, and the stories behind them.',
  });
}
