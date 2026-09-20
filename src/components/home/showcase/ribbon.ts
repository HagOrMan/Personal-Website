import type { UseInViewOptions, Variants } from 'motion/react';

import { getAccent } from '@/lib/projects/accents';

/** Which half of the row the media takes. The text takes the other one. */
export type RibbonSide = 'left' | 'right';

/**
 * Every row is handed its index across *both* sections rather than its index
 * within one, and that's what makes the zig-zag work: with two rows a section,
 * a per-section alternation fires once and reads as arbitrary, while four rows
 * running experience-into-projects read as rhythm. The two headings are the
 * only thing that separates them.
 *
 * Only takes effect from `md` up — below that there are no halves, and every
 * row stacks media-over-text. Same arrangement as the /experience timeline,
 * which also decides a side it only honours on wide screens.
 */
export function ribbonSide(index: number): RibbonSide {
  return index % 2 === 0 ? 'left' : 'right';
}

/**
 * The ribbon's accent for a row — the site's rotation, shared with the
 * /projects grid so the two can't drift apart.
 */
export const ribbonAccent = getAccent;

/**
 * Rows reveal a little before their midpoint reaches the middle of the
 * screen, so the animation has finished by the time you're actually reading.
 */
export const RIBBON_IN_VIEW_MARGIN: UseInViewOptions['margin'] =
  '-12% 0px -12% 0px';

/** Shared easing — a soft overshoot-free settle. */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * None of these branch `initial` on the reduced-motion setting, only the
 * transition. The server can't read that setting, so a hidden state that
 * depended on it would hydrate as a style mismatch; instead the reduced path
 * runs the same variants with a zero-length transition and simply arrives.
 */
export const rowContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function mediaVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, scale: reduced ? 1 : 0.96 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: reduced ? { duration: 0 } : { duration: 0.7, ease: EASE },
    },
  };
}

/**
 * The text enters from the edge it's nearest, which is the side the media
 * *isn't* on — so the two halves open away from each other rather than both
 * sliding the same way.
 */
export function textVariants(reduced: boolean, side: RibbonSide): Variants {
  const from = side === 'left' ? 28 : -28;

  return {
    hidden: { opacity: 0, x: reduced ? 0 : from },
    visible: {
      opacity: 1,
      x: 0,
      transition: reduced ? { duration: 0 } : { duration: 0.6, ease: EASE },
    },
  };
}
