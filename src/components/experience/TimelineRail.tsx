'use client';

import { motion, type MotionValue } from 'motion/react';

import { type ExperienceKind } from '@/data/experiences';
import { cn } from '@/lib/utils';

import { NODE_Y_CLASS, nodeBumpTransition, RAIL_X_CLASS } from './motion';

/**
 * The vertical line the whole page hangs off: a full-height track with a fill
 * scaled by scroll progress. Purely decorative - the sequence is already in
 * the DOM as an ordered list, so this is hidden from assistive tech.
 */
export function TimelineRail({ progress }: { progress: MotionValue<number> }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute bottom-0 w-0.5 -translate-x-1/2',
        // Starts at the first node rather than the top of the container, so
        // the line doesn't stub out above the first entry.
        NODE_Y_CLASS,
        RAIL_X_CLASS,
      )}
    >
      <div className='bg-border absolute inset-0 rounded-full' />
      {/*
        The fill is the one place reduced motion is handled in CSS rather than
        from useReducedMotion: `transform: none` leaves scaleY at 1, so the
        rail renders full. Doing it here rather than in JS means it's already
        right in the server's markup - the hook can't know the setting there,
        and branching the inline transform on it would hydrate as a mismatch.
      */}
      <motion.div
        className='from-nebula-500 to-breeze-500 absolute inset-0 origin-top rounded-full bg-linear-to-b motion-reduce:transform-none!'
        style={{ scaleY: progress }}
      />
    </div>
  );
}

/**
 * One node, positioned on the rail at its entry's date line.
 *
 * The shape carries the entry's kind: co-ops are a solid disc, volunteering
 * is a ring. Both are the same footprint so the rail stays visually even, and
 * the ring is filled with the page background so the rail doesn't show
 * through its middle. TimelineLegend spells the difference out.
 */
export function TimelineNode({
  kind,
  active,
  reduced,
}: {
  kind: ExperienceKind;
  /** True once the entry has come into view. Drives the fill and the bump. */
  active: boolean;
  reduced: boolean;
}) {
  return (
    // Positioning lives on a plain wrapper: motion writes `transform` inline
    // on the element it animates, which would clobber a Tailwind `-translate-*`.
    <span
      aria-hidden
      className={cn(
        'absolute z-10 -translate-x-1/2 -translate-y-1/2',
        NODE_Y_CLASS,
        RAIL_X_CLASS,
      )}
    >
      <motion.span
        initial={false}
        animate={{ scale: active && !reduced ? [1, 1.15, 1] : 1 }}
        transition={nodeBumpTransition}
        className={cn(
          'block size-3.5 rounded-full border-2 transition-colors duration-500 motion-reduce:transition-none',
          kind === 'volunteering'
            ? 'bg-background'
            : active
              ? 'bg-primary'
              : 'bg-border',
          active ? 'border-primary' : 'border-border',
        )}
      />
    </span>
  );
}

/**
 * Without this the two node shapes are an unexplained difference, which reads
 * as a rendering bug rather than as meaning. Built from the kinds actually
 * present, so it disappears entirely if every entry is the same kind.
 *
 * Hidden from assistive tech: it's a key to a shape nobody using a screen
 * reader can see, and every entry already names its own kind in an sr-only
 * span - so exposing this too would just be a list of two words with no
 * referent.
 */
export function TimelineLegend({
  kinds,
  labels,
}: {
  kinds: ExperienceKind[];
  labels: Record<ExperienceKind, string>;
}) {
  if (kinds.length < 2) return null;

  return (
    <ul
      aria-hidden
      className='text-muted-foreground mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs'
    >
      {kinds.map((kind) => (
        <li key={kind} className='flex items-center gap-2'>
          <span
            aria-hidden
            className={cn(
              'border-muted-foreground/60 block size-3 rounded-full border-2',
              kind === 'volunteering' ? 'bg-background' : 'bg-primary',
            )}
          />
          {labels[kind]}
        </li>
      ))}
    </ul>
  );
}
