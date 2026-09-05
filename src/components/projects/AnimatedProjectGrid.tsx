'use client';

import * as React from 'react';

import {
  DEFAULT_VARIANT_ID,
  PROJECT_CARD_VARIANTS,
} from '@/constant/variants/projectCardVariants';
import { TProjectShowcase } from '@/types/projects/ProjectShowcase';

import PopCard from '../containers/PopCard';

type Props = {
  variantId: string;
  /** Every project, in sort order — filtered-out cards stay mounted. */
  projects: TProjectShowcase[];
  /**
   * Which slugs are on screen right now. Anything else renders as
   * `display: none`: filtering is instant by design, and keeping the cards
   * mounted means no enter animation replays and the pop choreography's
   * bookkeeping never has to survive a changing list.
   */
  shownSlugs: Set<string>;
  /**
   * How the pops are choreographed:
   * - 'checkerboard': two alternating waves — every other card pops first
   *   (diagonals in 2 columns, every second card in 3), then the rest.
   * - 'popcorn': each card gets a small random delay, organic and playful.
   * - 'center': the original center-outward ripple.
   */
  mode?: 'checkerboard' | 'popcorn' | 'center';
};

const POP_DURATION = 0.4; // seconds per card (shake + pop)
const WAVE_OFFSET = 0.3; // seconds between checkerboard waves
const STAGGER = 0.04; // per-card stagger within a wave / for center mode
const POPCORN_SPREAD = 0.35; // max random delay for popcorn mode
const SWAP_TIMEOUT_BUFFER = 200; // ms of slack on the backstop timer

/**
 * Reads the resolved column count straight off the grid, which is both
 * cheaper and steadier than measuring children — `display: none` cards have
 * no box to measure.
 */
function useColumnCount(ref: React.RefObject<HTMLElement | null>) {
  const [columns, setColumns] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const tracks = getComputedStyle(el)
        .gridTemplateColumns.split(' ')
        .filter(Boolean);
      setColumns(Math.max(1, tracks.length));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return columns;
}

export function AnimatedProjectGrid({
  variantId,
  projects,
  shownSlugs,
  mode = 'checkerboard',
}: Props) {
  const [displayedId, setDisplayedId] = React.useState(variantId);
  const [visible, setVisible] = React.useState(true);
  const poppedCount = React.useRef(0);

  const gridRef = React.useRef<HTMLDivElement>(null);
  const columns = useColumnCount(gridRef);

  // Random delays for popcorn mode — regenerated for each swap so it
  // never plays the same way twice.
  const [popcornDelays, setPopcornDelays] = React.useState<number[]>([]);

  // Keep the latest target variant in a ref so that if variantId changes
  // again mid-exit, we swap to the newest one when the pops finish.
  const targetId = React.useRef(variantId);
  targetId.current = variantId;

  // Only cards on screen take part in the choreography, and they're numbered
  // by their visible position so the waves and the accent rotation both read
  // correctly however the grid is filtered.
  let cursor = 0;
  const entries = projects.map((project) => {
    const shown = shownSlugs.has(project.slug);
    return { project, shown, index: shown ? cursor++ : 0 };
  });
  const shownCount = cursor;

  const getDelay = (index: number): number => {
    if (mode === 'popcorn') {
      return popcornDelays[index] ?? 0;
    }

    if (mode === 'checkerboard') {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const wave = (row + col) % 2; // 0 = first wave, 1 = second wave
      // Small within-wave stagger keeps each wave from feeling mechanical.
      const withinWave = Math.floor(index / 2) * (STAGGER / 2);
      return wave * WAVE_OFFSET + withinWave;
    }

    // 'center': the original center-outward ripple.
    const center = (shownCount - 1) / 2;
    return Math.abs(index - center) * STAGGER;
  };

  const maxDelay = entries.reduce(
    (longest, entry) =>
      entry.shown ? Math.max(longest, getDelay(entry.index)) : longest,
    0,
  );

  // Read inside the swap effect, which must not re-run when filtering changes
  // these numbers mid-animation.
  const shownCountRef = React.useRef(shownCount);
  shownCountRef.current = shownCount;
  const maxDelayRef = React.useRef(maxDelay);
  maxDelayRef.current = maxDelay;

  const swapTarget = React.useRef(0);
  const swapTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishSwap = React.useCallback(() => {
    if (swapTimeout.current) {
      clearTimeout(swapTimeout.current);
      swapTimeout.current = null;
    }
    setDisplayedId(targetId.current);
    setVisible(true);
  }, []);

  React.useEffect(() => {
    if (variantId === displayedId) return;

    poppedCount.current = 0;
    swapTarget.current = shownCountRef.current;
    setPopcornDelays(projects.map(() => Math.random() * POPCORN_SPREAD));
    setVisible(false); // every PopCard starts its choreographed shake + pop

    // Filters can hide a card mid-pop, and a hidden card never reports back.
    // The timer guarantees the grid comes back rather than staying popped.
    if (swapTarget.current === 0) {
      finishSwap();
      return;
    }

    swapTimeout.current = setTimeout(
      finishSwap,
      (maxDelayRef.current + POP_DURATION) * 1000 + SWAP_TIMEOUT_BUFFER,
    );

    return () => {
      if (swapTimeout.current) {
        clearTimeout(swapTimeout.current);
        swapTimeout.current = null;
      }
    };
  }, [variantId, displayedId, projects, finishSwap]);

  const handlePopped = React.useCallback(() => {
    poppedCount.current += 1;
    if (poppedCount.current >= swapTarget.current) {
      // All cards have popped — swap the variant and bring them back in.
      finishSwap();
    }
  }, [finishSwap]);

  const active =
    PROJECT_CARD_VARIANTS.find((v) => v.id === displayedId) ??
    PROJECT_CARD_VARIANTS.find((v) => v.id === DEFAULT_VARIANT_ID)!;

  const { Component, extraProps = {} } = active;

  return (
    <div
      ref={gridRef}
      // Two columns at most, not three. The cards carry screen recordings,
      // and at three across a 80rem container each one was ~410px wide —
      // small enough that UI in a demo was unreadable. Two gives ~628px, and
      // dropping the sm breakpoint means phones and tablets get one
      // full-width card rather than two cramped ones.
      className='mx-auto grid w-full max-w-[80rem] grid-cols-1 gap-6 lg:grid-cols-2'
    >
      {entries.map(({ project, shown, index }) => (
        <PopCard
          // Keyed by slug so a card keeps its identity (and its DOM node)
          // through filtering, sorting and variant swaps alike.
          key={project.slug}
          className={shown ? undefined : 'hidden'}
          // Hidden cards sit out the choreography entirely: they stay in the
          // 'visible' state, so revealing one is instant.
          show={shown ? visible : true}
          duration={POP_DURATION}
          delay={shown ? getDelay(index) : 0}
          enterDelay={shown ? index * 0.02 : 0}
          // Critical for staggered grids: popped cards keep holding
          // their space so the layout never reflows mid-choreography
          // (otherwise later-popping cards get shoved into new rows).
          keepSpace
          onPopped={shown ? handlePopped : undefined}
        >
          <Component project={project} index={index} {...extraProps} />
        </PopCard>
      ))}
    </div>
  );
}
