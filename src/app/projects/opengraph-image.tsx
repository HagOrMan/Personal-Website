import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = "Kyle Hagerman's Projects";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Kyle's Corner",
    title: 'Projects',
    subtitle: "See all the cool projects I've worked on!",
  });
}
