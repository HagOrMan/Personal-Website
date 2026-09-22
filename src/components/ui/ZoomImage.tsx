'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Expand } from 'lucide-react';

import { Lightbox } from '@/components/ui/Lightbox';
import { cn } from '@/lib/utils';

export type ZoomImageProps = {
  src: string;
  alt: string;
  /**
   * Intrinsic pixel size. Required rather than optional: the lightbox sizes
   * the picture off the viewport's *height*, which needs the ratio, and the
   * thumbnail needs it to reserve the right box before the file arrives.
   */
  width: number;
  height: number;
  /**
   * Shown under the enlarged picture, and the reason the lightbox keeps room
   * at the bottom rather than handing the image the whole screen.
   */
  caption?: string;
  /** Classes for the trigger - the box the thumbnail sits in. */
  className?: string;
  /** Classes for the thumbnail image itself. */
  imageClassName?: string;
  /** The thumbnail's `sizes`. The lightbox always asks for a full-viewport one. */
  sizes?: string;
  priority?: boolean;
};

/**
 * Higher than Next's default 75, and only for the enlarged copy.
 *
 * The sources are already lossy webp, and the optimizer re-encodes whatever
 * it's given - so at the default the picture is compressed twice, and the
 * second pass is quantising artifacts from the first. That's invisible in a
 * 472px-wide thumbnail and very visible blown up across a laptop screen,
 * particularly on screenshots, where the damage lands on the edges of text.
 *
 * This buys back the second pass. It cannot buy back the first, and it can't
 * add pixels a 1080px-wide source never had - for that, the file itself has
 * to be re-exported larger. Keep this value in `images.qualities` in
 * next.config.ts, which is the allowlist the optimizer checks.
 */
const LIGHTBOX_QUALITY = 92;

/**
 * A thumbnail that opens full screen when you click it.
 *
 * `Lightbox` owns the viewer itself - the modal machinery, the sizing, the
 * click-off dismiss, the close button. This is the `next/image` half: the
 * thumbnail, its expand affordance, and the enlarged copy asked for at a
 * quality the optimizer's default doesn't reach. /gallery pairs the same
 * viewer with a hand-built `<picture>` instead.
 */
export function ZoomImage({
  src,
  alt,
  width,
  height,
  caption,
  className,
  imageClassName,
  sizes,
  priority = false,
}: ZoomImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <Lightbox
      open={open}
      onOpenChange={setOpen}
      // The picture carries no text of its own, so the alt text is the
      // dialog's accessible name.
      title={alt}
      ratio={width / height}
      caption={caption}
      trigger={
        // `flex` rather than `block` so the image is blockified and doesn't
        // leave a strip of inline descender space beneath itself.
        <button
          type='button'
          aria-label={`Expand image: ${alt}`}
          className={cn(
            'group focus-visible:ring-ring relative flex w-full cursor-zoom-in rounded-lg focus-visible:ring-2 focus-visible:outline-hidden',
            className,
          )}
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            priority={priority}
            className={cn('h-auto w-full', imageClassName)}
          />

          {/* The affordance for anyone who doesn't discover things by hovering
              a cursor over them. Deliberately white-on-black rather than
              themed: it sits on top of an arbitrary photo, where the site's
              surface tokens can't promise any contrast. */}
          <span
            aria-hidden
            className='pointer-events-none absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none md:top-3 md:right-3'
          >
            <Expand className='size-3.5' />
            Expand
          </span>
        </button>
      }
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        // It's the largest thing on the screen by construction, so there's no
        // smaller candidate worth describing. Next caps the request at the
        // source file's own width regardless.
        sizes='100vw'
        quality={LIGHTBOX_QUALITY}
        className='h-auto w-full rounded-lg shadow-2xl'
      />
    </Lightbox>
  );
}
