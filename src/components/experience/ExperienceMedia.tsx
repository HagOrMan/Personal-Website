'use client';

import { type CSSProperties, useRef, useState } from 'react';
import Image from 'next/image';

import { motion, useInView } from 'motion/react';

import { type ExperienceLogo, type ExperiencePhoto } from '@/data/experiences';
import { cn } from '@/lib/utils';

import {
  ENTRY_IN_VIEW_MARGIN,
  logoVariants,
  PHOTO_MAX_H,
  PHOTO_RAIL_GAP,
  photoInnerEdgeClass,
  photoRestTiltClass,
  photoVariants,
  type TimelineSide,
} from './motion';

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
 * The org's mark, tucked into the card's outer corner beside the heading.
 * Contained and padded on a neutral surface so it's never cropped, and it
 * lands square - it lives inside a straight-edged card, where a lean would
 * only read as a misprint.
 *
 * Deliberately tiny on mobile. There the card is only a couple of hundred
 * pixels wide and the mark shares its line with the date and the role, so it
 * has to read as a corner detail rather than as content; it only grows into
 * something you'd actually look at once there's a desktop card to hold it.
 *
 * A logo whose file isn't in /public yet falls back to an org monogram in the
 * same box, so an entry that's still being filled in never renders a broken
 * image or shifts the layout when the real file lands.
 */
export function LogoMark({
  logo,
  org,
  side,
  reduced,
}: {
  logo: ExperienceLogo;
  /** Only used for the missing-file monogram. */
  org: string;
  side: TimelineSide;
  reduced: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <motion.div
      variants={logoVariants(reduced, side)}
      className='bg-muted border-border relative size-10 rounded-md border p-1 md:size-24 md:rounded-lg md:p-3'
    >
      {failed ? (
        <span className='text-muted-foreground absolute inset-0 flex items-center justify-center text-xs font-semibold md:text-xl'>
          {monogram(org)}
        </span>
      ) : (
        <Image
          src={logo.src}
          alt={logo.alt}
          fill
          // `fill` resolves inset-0 against the padding box, so the wrapper's
          // padding is already the logo's breathing room.
          sizes='(min-width: 768px) 72px, 32px'
          className='object-contain'
          onError={() => setFailed(true)}
        />
      )}
    </motion.div>
  );
}

/**
 * How wide the photo renders. On desktop it fills the empty half of the
 * timeline opposite the card; below `md` it's inside the card, so page
 * padding, the rail inset and the card's own padding all come off.
 *
 * The upper bound, in other words. A photo the figure's --photo-cap catches
 * renders narrower than this, and the browser then fetches one size
 * up from what it strictly needs - which is the harmless direction to be
 * wrong in, and cheaper than encoding the cap's arithmetic here as well.
 */
const PHOTO_SIZES =
  '(min-width: 1024px) 472px, (min-width: 768px) 304px, calc(100vw - 8.5rem)';

/**
 * The entry's illustration, and the page's one bold gesture: it rises from
 * below, swings through, and - on desktop, where it's floating in open space
 * beside the timeline rather than boxed inside the card - settles at a slight
 * lean, like a print left on the page.
 *
 * The lean is a CSS class rather than part of the animation, which is what
 * lets it apply only from `md` up. Tailwind v4's rotate-* compiles to the
 * standalone `rotate` property and motion writes `transform`, so the two
 * compose: motion swings it to square, and CSS holds it at the lean.
 *
 * `side` here is the photo's own half of the timeline - the opposite one to
 * the card's - so it leans away from the rail, not into it.
 *
 * It watches itself rather than inheriting the entry's reveal, so it lands as
 * its own beat. That matters most on mobile, where it sits below the heading
 * inside the card and would otherwise have already played by the time you
 * scrolled down to it. On desktop it sits alongside the card in the opposite
 * half, so the two triggers land at more or less the same moment anyway.
 */
export function PhotoPlate({
  photo,
  side,
  reduced,
}: {
  photo: ExperiencePhoto;
  side: TimelineSide;
  reduced: boolean;
}) {
  const figureRef = useRef<HTMLElement>(null);
  const inView = useInView(figureRef, {
    once: true,
    margin: ENTRY_IN_VIEW_MARGIN,
  });

  // PHOTO_MAX_H is a height, and this is the width that height buys at this
  // image's ratio - so capping the figure caps the picture without the image
  // itself having to leave a dimension `auto`. A photo with no declared size
  // renders in the 16:9 fallback box below, which is the ratio to cap it at.
  const ratio =
    photo.width && photo.height ? photo.width / photo.height : 16 / 9;

  return (
    <motion.figure
      ref={figureRef}
      // Its own initial/animate pair, which is what detaches it from the
      // variants the entry propagates down. `initial` stays a constant so the
      // server's markup never depends on the reduced-motion setting.
      initial='hidden'
      animate={reduced || inView ? 'visible' : 'hidden'}
      variants={photoVariants(reduced, side)}
      style={
        {
          '--photo-cap': `calc(${PHOTO_MAX_H} * ${ratio.toFixed(4)})`,
          // The rail-side offset, and the whole reason this is arithmetic
          // rather than a plain margin: `100%` is the half's width and the cap
          // is the picture's, so their difference is the slack the cap left.
          // Take the gap or the slack, whichever is smaller, and a photo that
          // was never capped gets nothing and stays flush with the card. The
          // max() floors it at zero for the case where the cap is the larger
          // of the two and the subtraction goes negative.
          '--photo-inset': `min(${PHOTO_RAIL_GAP}, max(0px, calc(100% - var(--photo-cap))))`,
        } as CSSProperties
      }
      className={cn(
        'm-0 w-full',
        // Only consumed from md - below that the photo is inside the card,
        // where the card's own width is the only cap it needs.
        'md:max-w-(--photo-cap)',
        photoInnerEdgeClass(side),
        photoRestTiltClass(side),
      )}
    >
      {photo.width && photo.height ? (
        // Intrinsic sizing: the browser reserves the right box from the ratio
        // before the file arrives, and the image fills it exactly - no crop,
        // no bars. This is the path worth being on. The height cap is the
        // figure's problem, not this element's - see --photo-cap above.
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes={PHOTO_SIZES}
          className='ring-border h-auto w-full rounded-lg shadow-lg ring-1'
        />
      ) : (
        // No declared size, so fall back to a 16:9 box with the whole image
        // contained in it. Anything that isn't 16:9 letterboxes against the
        // muted surface - visibly a fallback, and fixed by adding width and
        // height to the entry.
        <div className='bg-muted ring-border relative aspect-video w-full overflow-hidden rounded-lg shadow-lg ring-1'>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={PHOTO_SIZES}
            className='object-contain'
          />
        </div>
      )}

      {photo.caption && (
        <figcaption className='text-muted-foreground mt-2 text-xs'>
          {photo.caption}
        </figcaption>
      )}
    </motion.figure>
  );
}
