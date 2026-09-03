import type { Transition, UseScrollOptions, Variants } from 'motion/react';

import type { ExperienceMedia } from '@/data/experiences';

/**
 * Every tunable the timeline's motion depends on, in one file. The rest of
 * the subtree imports from here rather than hard-coding durations, so the
 * whole page can be re-tuned without hunting through five components.
 */

/** The site's standard ease-out, same curve PageHeader and the project cards use. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Which way "away from the rail" points. Cards on the right of the rail lean
 * and travel right; cards on the left mirror it.
 *
 * Below `md` every card sits right of the rail regardless of its index, so an
 * odd-index entry animates as if it were on the left there. At 16px of travel
 * and a couple of degrees of tilt that reads as variation, not as a bug - and
 * it's the price of resolving `side` in Tailwind rather than by measuring the
 * viewport in JS at mount.
 */
export type TimelineSide = 'left' | 'right';
export const outwardDirection = (side: TimelineSide) =>
  side === 'right' ? 1 : -1;

/* ---------------------------------------------------------------- Rail -- */

/**
 * Damping on the raw scroll progress. Loose enough that the fill trails the
 * scroll a little, tight enough that it never feels like it's catching up.
 */
export const RAIL_SPRING = {
  stiffness: 120,
  damping: 30,
  restDelta: 0.001,
} as const;

/**
 * Where the fill starts and stops relative to the timeline container: it
 * begins once the first entry is 60% up the viewport, and completes as the
 * bottom of the last card comes into view.
 *
 * The end is `end end` rather than something further up the viewport for a
 * concrete reason. The timeline is the last thing on the page, and below it
 * sits only the shell's bottom padding and a compact footer - a couple of
 * hundred pixels. An end offset of, say, `end 0.4` would ask for the
 * container's bottom to reach 40% of the viewport height, which needs 60vh of
 * page underneath it; at maximum scroll it only ever gets to about 83% on a
 * 900px-tall window, so the rail would top out around three quarters full and
 * simply never finish. Any fraction below 1 has the same failure on a tall
 * enough window. `end end` is reachable by construction: the container's
 * bottom has to cross the viewport's bottom for the end of the timeline to be
 * visible at all.
 */
export const RAIL_SCROLL_OFFSET: UseScrollOptions['offset'] = [
  'start 0.6',
  'end end',
];

/* --------------------------------------------------------------- Entry -- */

/** Seconds between the date, the title block, and the body of one entry. */
export const ENTRY_STAGGER = 0.04;

/**
 * The li itself animates nothing - it exists to propagate `hidden`/`visible`
 * down to the parts that do.
 */
export const entryContainerVariants: Variants = {
  hidden: {},
  visible: {},
};

/**
 * One reveal per entry, sequenced by the `custom` prop each part passes
 * (0 = date, 1 = title, 2 = body). Deliberately a delay rather than
 * `staggerChildren`: the parts live in different grid cells at `md`, so
 * they aren't all direct children of one motion element.
 *
 * `reduced` changes only the transition, never the `hidden` values. That's
 * load-bearing: `useReducedMotion` returns false on the server and the real
 * setting on the first client render, so anything it touches in `hidden` -
 * the style motion writes into the SSR'd markup - would hydrate as a
 * mismatch. Keeping the shape fixed and cutting the duration to zero lands a
 * reduced-motion visitor on the finished state without ever animating, and
 * the intermediate state is invisible anyway at `opacity: 0`.
 */
export function entryItemVariants(
  reduced: boolean,
  side: TimelineSide,
): Variants {
  const dir = outwardDirection(side);
  return {
    hidden: { opacity: 0, x: 16 * dir },
    visible: (index: number = 0) => ({
      opacity: 1,
      x: 0,
      transition: reduced
        ? { duration: 0 }
        : { duration: 0.5, ease: EASE_OUT, delay: index * ENTRY_STAGGER },
    }),
  };
}

/* --------------------------------------------------------------- Media -- */

/**
 * Where the media settles. A tilted corporate logo reads as a mistake, so
 * logos land nearly straight; a tilted photo reads as a print left on a desk,
 * so photos keep a visible lean.
 */
export const MEDIA_REST_TILT: Record<ExperienceMedia['kind'], number> = {
  logo: 0.75,
  photo: 2.5,
};

/**
 * The page's one bold gesture: the media swings in from outside the card and
 * settles at its resting tilt. Everything else on the page stays quiet.
 *
 * Same rule as the entry variants - `reduced` cuts the transition to zero
 * rather than reshaping `hidden`, so the SSR'd style never depends on a
 * setting the server can't see. The resting tilt survives either way: that's
 * a static property of how the media is meant to sit, not motion.
 */
export function mediaVariants(
  reduced: boolean,
  side: TimelineSide,
  kind: ExperienceMedia['kind'],
): Variants {
  const dir = outwardDirection(side);

  return {
    hidden: { opacity: 0, x: 32 * dir, rotate: 9 * dir, scale: 0.94 },
    visible: {
      opacity: 1,
      x: 0,
      rotate: MEDIA_REST_TILT[kind] * dir,
      scale: 1,
      transition: reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 },
    },
  };
}

/* ---------------------------------------------------------------- Node -- */

/**
 * The node's activation bump. The colour change rides along on a Tailwind
 * `transition-colors`, so this only has to carry the scale.
 */
export const nodeBumpTransition: Transition = {
  duration: 0.45,
  ease: EASE_OUT,
  times: [0, 0.45, 1],
};

/** How much of an entry has to be on screen before it reveals and its node fills. */
export const ENTRY_IN_VIEW_AMOUNT = 0.4;

/* ----------------------------------------------------------- Accordion -- */

/**
 * User-triggered, so it should feel immediate. No spring on the height: an
 * overshoot on a growing panel shoves the rest of the page around.
 */
export const accordionTransition = (reduced: boolean): Transition =>
  reduced
    ? { duration: 0 }
    : {
        height: { duration: 0.24, ease: EASE_OUT },
        opacity: { duration: 0.18, ease: 'linear' },
      };

export const chevronTransition = (reduced: boolean): Transition =>
  reduced ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT };

/* ------------------------------------------------------------- Geometry -- */

/**
 * The rail, the nodes and the desktop connectors all have to agree on where
 * the rail's centre line is and how far down an entry its node sits. Sharing
 * the class strings is what keeps them from drifting apart.
 */

/** Horizontal centre of the rail: a fixed left inset on mobile, centred at `md`. */
export const RAIL_X_CLASS = 'left-4 md:left-1/2';

/** Vertical centre of a node within its entry - roughly the card's date line. */
export const NODE_Y_CLASS = 'top-8 md:top-9';

/**
 * How far a card is inset past the rail's centre line. The desktop connector
 * spans exactly this, so the two have to stay in step: `w-10` is `2.5rem`.
 */
export const CONNECTOR_W_CLASS = 'w-10';
export const CARD_INSET_RIGHT_CLASS = 'pl-12 md:pr-0 md:pl-[calc(50%+2.5rem)]';
export const CARD_INSET_LEFT_CLASS = 'pl-12 md:pl-0 md:pr-[calc(50%+2.5rem)]';
