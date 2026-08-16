import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';
import { SITE } from '@/lib/seo';

export const alt = SITE.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Kyle's Corner",
    title: 'Kyle Hagerman',
    subtitle:
      'Software developer building robust, maintainable systems. Portfolio, projects, and writing.',
  });
}
