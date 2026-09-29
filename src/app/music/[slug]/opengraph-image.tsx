import { mediaUrl } from '@/lib/media';
import { getComposition } from '@/lib/music';
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from '@/lib/og/renderOgImage';

export const alt = 'A composition by Kyle Hagerman';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const composition = getComposition((await params).slug);
  if (!composition) {
    return renderOgImage({ eyebrow: 'Music', title: "Kyle's Corner" });
  }

  const { assets } = composition;
  const pageOne = assets ? mediaUrl(assets.og) : '';

  return renderOgImage({
    eyebrow: `${composition.instrumentation} · ${composition.year}`,
    title: composition.title,
    subtitle: composition.subtitle,
    // Page 1, fitted to the card's height down the right-hand side. Small
    // enough that the notes aren't legible - it's there to say "score".
    // Satori fetches it at render time, so it needs an absolute URL; without
    // NEXT_PUBLIC_R2_BASE_URL the card goes without rather than failing.
    aside:
      assets && pageOne.startsWith('http')
        ? {
            src: pageOne,
            width: Math.round(
              (OG_SIZE.height * assets.pageWidth) / assets.pageHeight,
            ),
          }
        : undefined,
  });
}
