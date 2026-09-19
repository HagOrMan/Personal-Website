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
export function TimelineRail({
  progress,
  ref,
}: {
  progress: MotionValue<number>;
  /** Timeline measures this box to work out where each node sits on it. */
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
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
 *
 * Two things were wrong with the earlier version. Its unlit colour was
 * `bg-border`, the same token as the rail's own track, so an unreached node
 * was invisible against the line - nodes appeared to pop into existence
 * rather than light up, which is why they only ever looked "active". And it
 * lit on `useInView`, a signal with no relationship to where the rail's fill
 * had actually got to, so a node could colour in well before or after the
 * line reached it. Now `reached` comes from the fill's own progress: a node
 * lights exactly as the line arrives at it, and dims again if you scroll
 * back up past it. The `ring-background` halo keeps it legible against the
 * rail in both states.
 */
export function TimelineNode({
  kind,
  reached,
  reduced,
}: {
  kind: ExperienceKind;
  /** True once the rail's fill has grown past this node's centre. */
  reached: boolean;
  reduced: boolean;
}) {
  return (
    // Positioning lives on a plain wrapper so the box Timeline measures is a
    // steady 14px: getBoundingClientRect reports the *scaled* box, so reading
    // the bumping element itself would make a node's position on the rail
    // wobble every time it activated. It's found by the data attribute below.
    <span
      aria-hidden
      data-timeline-node
      className={cn(
        'absolute z-10 -translate-x-1/2 -translate-y-1/2',
        NODE_Y_CLASS,
        RAIL_X_CLASS,
      )}
    >
      <motion.span
        initial={false}
        animate={{ scale: reached && !reduced ? [1, 1.15, 1] : 1 }}
        transition={nodeBumpTransition}
        className={cn(
          // Both the border and the disc are currentColor, so the lit/unlit
          // states are one text-* swap rather than four class permutations.
          'ring-background block size-3.5 rounded-full border-2 border-current ring-2 transition-colors duration-300 motion-reduce:transition-none',
          kind === 'volunteering' ? 'bg-background' : 'bg-current',
          // Lit is a shade of the rail's own gradient rather than the site's
          // turquoise primary, which fought the purple-to-blue line it sits on.
          reached ? 'text-breeze-400' : 'text-muted-foreground/40',
          // Reduced motion renders the rail full, so every node matches it.
          // In CSS rather than from the hook: `reached` is false in the
          // server's markup, and a class that flipped on the first client
          // render would hydrate as a mismatch. Spelled out in full because
          // Tailwind only sees complete class strings - a built-up one would
          // compile to nothing.
          'motion-reduce:text-breeze-400!',
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
      className={cn(
        'text-muted-foreground mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs',
        // Pushed to the far edge once the rail moves to the centre, so it
        // reads as a key sitting beside the timeline rather than as the
        // first thing hanging off it.
        'md:justify-end',
      )}
    >
      {kinds.map((kind) => (
        <li key={kind} className='flex items-center gap-2'>
          {/* Same currentColor trick as the nodes, in the same lit shade, so
              the key and the thing it describes can't drift apart. */}
          <span
            aria-hidden
            className={cn(
              'text-breeze-400 block size-3 rounded-full border-2 border-current',
              kind === 'volunteering' ? 'bg-background' : 'bg-current',
            )}
          />
          {labels[kind]}
        </li>
      ))}
    </ul>
  );
}
