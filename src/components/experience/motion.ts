import type {
  Transition,
  UseInViewOptions,
  UseScrollOptions,
  Variants,
} from 'motion/react';

/**
 * Every tunable the timeline's motion depends on, in one file. The rest of
 * the subtree imports from here rather than hard-coding durations, so the
 * whole page can be re-tuned without hunting through five components.
 */

/** The site's standard ease-out, same curve PageHeader and the project cards use. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Which way "away from the rail" points, for whichever half of the timeline
 * the thing occupies. Note that a card and its photo sit on opposite halves,
 * so they get opposite sides - and lean opposite ways.
 *
 * Below `md` every card sits right of the rail regardless of its index, so an
 * odd-index entry animates as if it were on the left there. At 16px of travel
 * that reads as variation rather than as a bug - and it's the price of
 * resolving `side` in Tailwind rather than by measuring the viewport in JS at
 * mount.
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
 * Nothing here sets a resting tilt any more, and both gestures land square.
 *
 * A tilt only reads as deliberate on something that isn't sitting inside a
 * straight-edged box - against a card's own border, a couple of degrees just
 * looks like a rendering fault. The logo never leaves the card, so it lands
 * flat, full stop. The photo does leave it on desktop, and its resting lean
 * is applied there in CSS (see `photoRestTiltClass`) so it can exist at `md`
 * and up and be absent below, where the photo is back inside the card.
 *
 * Tailwind v4's rotate-* utilities compile to the standalone `rotate`
 * property while motion writes `transform`, so the two compose instead of
 * overwriting each other - which is what makes that split possible at all.
 */

/**
 * The logo swings in from the card's outer edge, horizontally.
 *
 * Modest on purpose. The travel is a fixed pixel figure while the mark is
 * 40px on mobile and 96px from md, so anything larger reads as a proportionate
 * arc on a desktop card and as the whole corner lurching about on a phone.
 */
export const LOGO_TRAVEL = 24;
export const LOGO_ENTRY_TILT = 7;

export function logoVariants(reduced: boolean, side: TimelineSide): Variants {
  const dir = outwardDirection(side);

  return {
    hidden: {
      opacity: 0,
      x: LOGO_TRAVEL * dir,
      rotate: LOGO_ENTRY_TILT * dir,
      scale: 0.94,
    },
    visible: {
      opacity: 1,
      x: 0,
      rotate: 0,
      scale: 1,
      transition: reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 },
    },
  };
}

/**
 * The photo rises from below and swings through to square, counter-leaning on
 * the way in so it settles into the CSS tilt rather than away from it.
 */
export const PHOTO_RISE = 28;
export const PHOTO_ENTRY_TILT = 6;

export function photoVariants(reduced: boolean, side: TimelineSide): Variants {
  const dir = outwardDirection(side);

  return {
    hidden: {
      opacity: 0,
      y: PHOTO_RISE,
      rotate: -PHOTO_ENTRY_TILT * dir,
      scale: 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 200, damping: 24, mass: 0.9 },
    },
  };
}

/**
 * The photo's resting lean, away from the rail. Deliberately CSS and
 * deliberately `md`-only: below that the photo is inside the card, where a
 * lean is exactly the thing that looked wrong.
 *
 * Both strings are spelled out in full - Tailwind only ever sees complete
 * class names, so a built-up one would compile to nothing.
 */
export const photoRestTiltClass = (side: TimelineSide) =>
  side === 'right' ? 'md:rotate-[2.5deg]' : 'md:-rotate-[2.5deg]';

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

/**
 * When a reveal fires: as its element's top edge crosses 85% of the viewport,
 * so it's already going by the time you've properly seen the thing.
 *
 * A negative bottom root-margin rather than an `amount`, because `amount` is
 * a fraction of the element's *own* height and these elements are mostly
 * empty space. An entry is 72vh tall with a ~340px card at the top of it, so
 * waiting for 40% of the entry meant waiting long after the card itself had
 * arrived - and the same figure meant something different again at md, where
 * entries are 56vh, and different a third time on the last entry, which has
 * no minimum height at all. A margin is height-independent, so every reveal
 * on the page fires at the same place on screen.
 */
export const ENTRY_IN_VIEW_MARGIN: UseInViewOptions['margin'] =
  '0px 0px -25% 0px';

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
 * How far a card is inset past the rail's centre line, and the connector that
 * bridges the gap. The connector spans exactly this, so the three have to
 * stay in step.
 *
 * The mobile inset is `pl-14` (3.5rem) against a rail centred at `left-4`
 * (1rem), which leaves a 2.5rem gap - deliberately the same 2.5rem the card
 * is inset past the centre line at `md`. That means one `w-10` is right at
 * every width, which in turn keeps the connector's reduced-motion override a
 * single class instead of a per-breakpoint pair fighting over precedence.
 */
export const CONNECTOR_W_CLASS = 'w-10';
export const CARD_INSET_RIGHT_CLASS = 'pl-14 md:pr-0 md:pl-[calc(50%+2.5rem)]';
export const CARD_INSET_LEFT_CLASS = 'pl-14 md:pl-0 md:pr-[calc(50%+2.5rem)]';

/**
 * Where a photo sits from `md` up: the half of the timeline the card isn't
 * using, mirroring the card's own inset so the two read as a matched pair
 * either side of the rail.
 *
 * It's absolutely positioned against the entry's `<li>` - the card is a grid
 * and is deliberately left unpositioned, so the photo can start life as an
 * ordinary block inside it on mobile and be lifted out of the card entirely
 * at `md` without being duplicated in the DOM. If the card ever gains
 * `relative`, this breaks and the photo will land inside it.
 */
export const PHOTO_HALF_LEFT_CLASS =
  'md:absolute md:top-0 md:left-0 md:right-[calc(50%+2.5rem)]';
export const PHOTO_HALF_RIGHT_CLASS =
  'md:absolute md:top-0 md:right-0 md:left-[calc(50%+2.5rem)]';
