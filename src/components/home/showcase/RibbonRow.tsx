'use client';

import { type CSSProperties, type ReactNode, useRef } from 'react';

import { motion, useInView, useReducedMotion } from 'motion/react';

import { ACCENT_VARS } from '@/lib/projects/accents';
import { cn } from '@/lib/utils';

import {
  mediaVariants,
  RIBBON_IN_VIEW_MARGIN,
  ribbonAccent,
  ribbonSide,
  rowContainerVariants,
  textVariants,
} from './ribbon';

/**
 * One row of the homepage ribbon: media in one half, words in the other, the
 * halves swapping row to row.
 *
 * There is no card here on purpose — no border, no surface, no radius. What
 * separates one row from the next is the space between them, a hairline that
 * fades out before it reaches either margin, and the fact that the media has
 * moved to the other side. Everything a card's edge would have done is being
 * done by something else: the fade mask dissolves the media into the page,
 * and the accent glow behind it says where the row is without drawing a box
 * around it.
 *
 * Generic over what's inside. Experience rows and project rows differ
 * entirely in their content and not at all in their geometry, so both hand
 * this their two halves and let it own the layout, the reveal, and the accent.
 */
export function RibbonRow({
  index,
  media,
  children,
  showDivider = false,
  onActiveChange,
}: {
  /** Position across the whole ribbon, not within a section — see ribbonSide. */
  index: number;
  media: ReactNode;
  /** The text half. */
  children: ReactNode;
  /**
   * Whether to draw the hairline above this row. Owned by the row rather than
   * interleaved by the section, which would have meant rebuilding the
   * children list and inventing keys for entries that already have good ones.
   * Every section passes `position > 0` — a section's first row is already
   * separated by its heading.
   */
  showDivider?: boolean;
  /**
   * Fires when the pointer or keyboard focus enters and leaves the row. Only
   * the project rows care: it's what starts their preview loop, and the row
   * is the target rather than the media itself so that reading the blurb
   * keeps the video running.
   */
  onActiveChange?: (active: boolean) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { once: true, margin: RIBBON_IN_VIEW_MARGIN });

  // With motion off there's no reveal to wait for, so the row is simply there
  // rather than waiting on an observer it doesn't need.
  const revealed = reduced || inView;

  const side = ribbonSide(index);
  const accent = ribbonAccent(index);
  const { glow, border, text: accentText } = ACCENT_VARS[accent];
  const mediaOnLeft = side === 'left';

  // Nothing in the type system says a slotted entry has a photo — the field
  // is optional on both. Rather than hold open half a row for an image that
  // isn't there, a row without media runs full width and the alternation
  // simply skips a beat.
  const hasMedia = media != null;

  return (
    <>
      {showDivider && (
        <div
          aria-hidden
          className='my-14 h-px w-full md:my-20'
          style={{
            background: `linear-gradient(to right, transparent, color-mix(in srgb, ${border} 32%, transparent) 50%, transparent)`,
          }}
        />
      )}

      <motion.article
        ref={ref}
        // `group/row` rather than a bare group: the media's glint and the
        // project preview both hang off hovering the row, and a group on the
        // media instead would only catch a pointer over the image.
        className='group/row relative'
        variants={rowContainerVariants}
        initial='hidden'
        animate={revealed ? 'visible' : 'hidden'}
        onPointerEnter={() => onActiveChange?.(true)}
        onPointerLeave={() => onActiveChange?.(false)}
        onFocus={() => onActiveChange?.(true)}
        // React's focus events bubble, so this covers focus anywhere inside.
        // Moving between the row's own links isn't leaving it, hence the
        // relatedTarget check — otherwise a preview stops and restarts on
        // every tab press.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onActiveChange?.(false);
          }
        }}
      >
        {/* The aurora: a big soft wash of the row's accent sitting behind the
            media, so the colour follows the zig-zag instead of washing the
            section evenly. Its job is to keep the media from floating on bare
            background now that nothing frames it — it's the thing standing in
            for a card's surface.

            Bigger than the row and allowed to hang off it: the section clips
            the horizontal overflow only, which is what turns a circle into a
            glow bleeding in from the margin rather than one sliced flat at
            the section's edge.

            Light mode carries far more of it than dark. The glow has to lift
            off its background to be seen at all, and there's much less room
            to do that between a saturated accent and a near-white page than
            between the same accent and a near-black one — 0.18 was invisible
            on light while reading fine on dark.

            The softness is stops, not `filter: blur()`, and that's a
            performance decision rather than a stylistic one. A blur forces
            the element onto its own compositor layer and re-runs a blur pass
            over it; four of these, each around 70% of the column wide,
            alongside a full-screen WebGL canvas is real work for a mid-range
            phone to find. A multi-stop gradient is an ordinary paint with no
            layer and no pass, and at this radius it's indistinguishable.
            Tune the feel with the stop percentages and the opacity below. */}
        <div
          aria-hidden
          style={{
            background: `radial-gradient(closest-side, ${glow} 0%, color-mix(in srgb, ${glow} 55%, transparent) 45%, color-mix(in srgb, ${glow} 18%, transparent) 72%, transparent 100%)`,
          }}
          className={cn(
            'pointer-events-none absolute -z-10 rounded-full opacity-[0.42] dark:opacity-[0.38]',
            // Stacked layout: the media is the top half of the row, so the
            // glow sits over that rather than spanning the whole row and
            // coming out centred on the text.
            'top-[-6%] left-1/2 h-[58%] w-[92%] -translate-x-1/2',
            // Two halves from md up, so it goes back to covering the media's
            // one — taller than the row and hanging off the outer margin.
            'md:top-[-25%] md:h-[150%] md:w-[70%] md:translate-x-0',
            mediaOnLeft ? 'md:left-[-10%]' : 'md:right-[-10%] md:left-auto',
          )}
        />

        <div
          className={cn(
            'grid items-center gap-8 md:gap-14',
            hasMedia && 'md:grid-cols-2',
          )}
        >
          {/* Media is always first in the DOM, so on a phone every row reads
              picture-then-words and the alternation stays a desktop rhythm
              rather than something that shuffles the reading order. */}
          <motion.div
            variants={mediaVariants(reduced)}
            className={cn(!hasMedia && 'hidden', !mediaOnLeft && 'md:order-2')}
          >
            <div
              className='ribbon-fade relative overflow-hidden'
              style={
                // Pushes the mask's opaque centre toward the text, so the
                // heavy falloff lands on the edge facing out of the page
                // and the side facing the words stays crisp.
                {
                  '--ribbon-focus-md': mediaOnLeft ? '66%' : '34%',
                } as CSSProperties
              }
            >
              {media}

              {/* The glint. One pass on hover or focus, never a loop — see
                  the keyframes. Pure white at low alpha in both themes:
                  it's meant to read as light crossing the surface, and
                  tinting it would make it a colour wash instead. */}
              <div
                aria-hidden
                className='motion-safe:group-hover/row:animate-ribbon-glint motion-safe:group-focus-within/row:animate-ribbon-glint pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0'
              />
            </div>
          </motion.div>

          <motion.div
            variants={textVariants(reduced, side)}
            // The accent reaches the text half through this one variable,
            // which the eyebrow, the chips and the demo button all read.
            // Keeps every coloured thing in a row on the same colour without
            // threading a prop through each of them.
            style={{ '--row-accent': accentText } as CSSProperties}
            className='flex flex-col items-start gap-3'
          >
            {children}
          </motion.div>
        </div>
      </motion.article>
    </>
  );
}
