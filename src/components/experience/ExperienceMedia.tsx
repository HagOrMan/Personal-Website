'use client';

import { useState } from 'react';
import Image from 'next/image';

import { motion } from 'motion/react';

import { type ExperienceMedia as ExperienceMediaData } from '@/data/experiences';
import { cn } from '@/lib/utils';

import { mediaVariants, type TimelineSide } from './motion';

/**
 * First letters of the first two words that start with a letter. Only ever
 * seen when a logo file is missing, so it doesn't need to be clever.
 */
function monogram(org: string): string {
  return org
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/**
 * How wide the photo renders at each breakpoint. It spans the card's content
 * box, so this tracks the card width: page padding, the rail inset, and the
 * card's own padding all come off the viewport.
 */
const PHOTO_SIZES =
  '(min-width: 1024px) 432px, (min-width: 768px) 288px, calc(100vw - 8.5rem)';

/**
 * The entry's image, swinging in from outside the card and settling at a
 * slight tilt. Two shapes, and they want opposite things:
 *
 *   logo  - a small square that sits beside the title on the card's outer
 *           edge. Contained and padded on a neutral surface, never cropped.
 *   photo - the full width of the card, at its own aspect ratio. Screenshots
 *           and group shots are wide; squeezing one into a narrow side column
 *           and cropping it to a fixed frame threw most of the picture away
 *           and left the text wedged into what was left.
 *
 * A logo whose file isn't in /public yet falls back to an org monogram in the
 * same box, so an entry that's still being filled in never renders a broken
 * image or shifts the layout when the real file lands.
 */
export function ExperienceMedia({
  media,
  org,
  side,
  reduced,
}: {
  media: ExperienceMediaData;
  /** Only used for the missing-logo monogram. */
  org: string;
  side: TimelineSide;
  reduced: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <motion.figure
      variants={mediaVariants(reduced, side, media.kind)}
      className={cn('m-0', media.kind === 'photo' ? 'w-full' : 'w-fit')}
    >
      {media.kind === 'logo' ? (
        <div className='bg-muted border-border relative size-20 rounded-lg border p-3 md:size-24'>
          {failed ? (
            <span className='text-muted-foreground absolute inset-0 flex items-center justify-center text-xl font-semibold'>
              {monogram(org)}
            </span>
          ) : (
            <Image
              src={media.src}
              alt={media.alt}
              fill
              // `fill` resolves inset-0 against the padding box, so the
              // wrapper's p-3 is already the logo's breathing room.
              sizes='(min-width: 768px) 72px, 56px'
              className='object-contain'
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : media.width && media.height ? (
        // Intrinsic sizing: the browser reserves the right box from the ratio
        // before the file arrives, and the image fills it exactly - no crop,
        // no bars. This is the path worth being on.
        <Image
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
          sizes={PHOTO_SIZES}
          className='ring-border h-auto w-full rounded-lg shadow-md ring-1'
        />
      ) : (
        // No declared size, so fall back to a 16:9 box with the whole image
        // contained in it. Anything that isn't 16:9 letterboxes against the
        // muted surface - visibly a fallback, and fixed by adding width and
        // height to the entry.
        <div className='bg-muted ring-border relative aspect-video w-full overflow-hidden rounded-lg shadow-md ring-1'>
          <Image
            src={media.src}
            alt={media.alt}
            fill
            sizes={PHOTO_SIZES}
            className='object-contain'
          />
        </div>
      )}

      {media.kind === 'photo' && media.caption && (
        <figcaption className='text-muted-foreground mt-2 text-xs'>
          {media.caption}
        </figcaption>
      )}
    </motion.figure>
  );
}
