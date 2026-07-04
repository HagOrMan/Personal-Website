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
  projects: TProjectShowcase[];
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

/**
 * Measures how many children of a flex-wrap container fit on the first row.
 * Re-measures on resize so the checkerboard stays correct at any width.
 */
function useColumnCount(ref: React.RefObject<HTMLElement | null>) {
  const [columns, setColumns] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const firstRowTop = children[0].offsetTop;
      let count = 0;
      for (const child of children) {
        if (Math.abs(child.offsetTop - firstRowTop) > 1) break;
        count++;
      }
      setColumns(Math.max(1, count));
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

  React.useEffect(() => {
    if (variantId === displayedId) return;
    poppedCount.current = 0;
    setPopcornDelays(projects.map(() => Math.random() * POPCORN_SPREAD));
    setVisible(false); // every PopCard starts its choreographed shake + pop
  }, [variantId, displayedId, projects]);

  const handlePopped = React.useCallback(() => {
    poppedCount.current += 1;
    if (poppedCount.current === projects.length) {
      // All cards have popped — swap the variant and bring them back in.
      setDisplayedId(targetId.current);
      setVisible(true);
    }
  }, [projects.length]);

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
    const center = (projects.length - 1) / 2;
    return Math.abs(index - center) * STAGGER;
  };

  const active =
    PROJECT_CARD_VARIANTS.find((v) => v.id === displayedId) ??
    PROJECT_CARD_VARIANTS.find((v) => v.id === DEFAULT_VARIANT_ID)!;

  const { Component, extraProps = {} } = active;

  return (
    <div ref={gridRef} className='flex flex-wrap justify-center gap-4'>
      {projects.map((project, index) => (
        <PopCard
          // key must be stable across variant swaps — if it changed,
          // the PopCard would unmount and the exit could never play.
          key={index}
          show={visible}
          duration={POP_DURATION}
          delay={getDelay(index)}
          enterDelay={index * 0.02}
          // Critical for staggered grids: popped cards keep holding
          // their space so the layout never reflows mid-choreography
          // (otherwise later-popping cards get shoved into new rows).
          keepSpace
          onPopped={handlePopped}
        >
          <Component project={project} index={index} {...extraProps} />
        </PopCard>
      ))}
    </div>
  );
}
