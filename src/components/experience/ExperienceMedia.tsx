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
 * The entry's image, swinging in from outside the card and settling at a
 * slight tilt. Two shapes:
 *
 *   logo  - contained and padded on a neutral surface, small fixed footprint,
 *           never cropped, and barely tilted.
 *   photo - filled to a 4:3 frame, larger, with an optional caption, and
 *           tilted enough to read as a print someone left on a desk.
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
      className={cn(
        'm-0',
        media.kind === 'photo' ? 'w-full md:w-52 lg:w-60' : 'w-fit',
      )}
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
      ) : (
        <div className='ring-border relative aspect-[4/3] w-full overflow-hidden rounded-lg shadow-md ring-1'>
          <Image
            src={media.src}
            alt={media.alt}
            fill
            sizes='(min-width: 1024px) 240px, (min-width: 768px) 208px, calc(100vw - 9rem)'
            className='object-cover'
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
