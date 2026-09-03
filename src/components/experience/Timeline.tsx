'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useMotionValueEvent, useScroll, useSpring } from 'motion/react';

import {
  type Experience,
  type ExperienceKind,
  KIND_LABELS,
} from '@/data/experiences';
import { cn } from '@/lib/utils';

import { RAIL_SCROLL_OFFSET, RAIL_SPRING } from './motion';
import { TimelineEntry } from './TimelineEntry';
import { TimelineLegend, TimelineRail } from './TimelineRail';

/**
 * The scroll-revealed experience timeline: the rail and its fill live here,
 * the entries own their own reveal.
 *
 * This is the only client component on /experience - the page itself stays a
 * server component and hands the sorted data down.
 */
export function Timeline({ experiences }: { experiences: Experience[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: RAIL_SCROLL_OFFSET,
  });
  const progress = useSpring(scrollYProgress, RAIL_SPRING);

  /**
   * How far down the rail each node sits, as a fraction of the rail's height -
   * which is the same 0..1 scale the fill's scaleY runs on. So a node is lit
   * exactly when `progress` passes its threshold, and the two can't drift.
   *
   * Measured off bounding boxes rather than offsetTop so it doesn't care
   * about the offsetParent chain, and re-measured by the observer below
   * whenever the container changes height.
   */
  const thresholds = useRef<number[]>([]);
  const [litCount, setLitCount] = useState(0);

  const measureNodes = useCallback(() => {
    const rail = railRef.current;
    const list = listRef.current;
    if (!rail || !list) return;

    const railBox = rail.getBoundingClientRect();
    if (!railBox.height) return;

    thresholds.current = Array.from(
      list.querySelectorAll<HTMLElement>('[data-timeline-node]'),
    ).map((node) => {
      const box = node.getBoundingClientRect();
      const centre = box.top + box.height / 2 - railBox.top;
      // The first node sits exactly where the rail starts, so its raw
      // threshold is 0 and it would read as lit before the fill has any
      // height at all. A hair above zero makes it light as the fill starts.
      return Math.max(centre / railBox.height, 0.001);
    });
  }, []);

  const syncLit = useCallback((value: number) => {
    // A plain loop rather than filter().length - this runs on every animation
    // frame the spring is moving, and there's no reason to allocate on each.
    let count = 0;
    for (const threshold of thresholds.current) {
      if (value >= threshold) count += 1;
    }
    // Returning the identical value lets React bail out, so this is a no-op
    // on the vast majority of those frames.
    setLitCount((current) => (current === count ? current : count));
  }, []);

  useMotionValueEvent(progress, 'change', syncLit);

  /**
   * `useScroll` measures the target once and then re-measures only on scroll
   * and on window resize - it never watches the target's own box. Expanding
   * an accordion grows this container without either of those firing, so the
   * rail's progress would stay pinned to the old height until the next scroll.
   *
   * A window `resize` event is precisely what motion's scroll listener is
   * already waiting for, so re-broadcasting one is what makes it re-measure.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      // One pass per frame, and outside the observer callback, so a listener
      // that reads layout can't feed straight back into the observer.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The node thresholds are fractions of the rail's height, so they go
        // stale on exactly the same events the scroll measurement does.
        measureNodes();
        syncLit(progress.get());
        window.dispatchEvent(new Event('resize'));
      });
    });

    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measureNodes, syncLit, progress]);

  // Declaration order from KIND_LABELS, narrowed to the kinds actually used -
  // so the legend never advertises a shape that isn't on the page.
  const kindsPresent = (Object.keys(KIND_LABELS) as ExperienceKind[]).filter(
    (kind) => experiences.some((experience) => experience.kind === kind),
  );

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-5xl',
        // Insurance for the narrowest screens: the media swings in from
        // outside the card and rotates on the way, and on a ~320px viewport
        // the card is wide enough that the overshoot gets close to the
        // page edge (see MEDIA_MOTION for the travel values). `clip`
        // rather than `hidden` so this never becomes a scroll container, and
        // only below md - on a desktop the container has hundreds of pixels
        // of slack either side, so clipping there would only cost us the
        // overhang the gesture is made of.
        'overflow-x-clip md:overflow-x-visible',
      )}
    >
      <TimelineLegend kinds={kindsPresent} labels={KIND_LABELS} />

      <div ref={containerRef} className='relative'>
        <TimelineRail progress={progress} ref={railRef} />

        {/* A real sequence, so it says so. Sides alternate at md and up; below
            that TimelineEntry pins every card to the right of the rail. */}
        <ol ref={listRef} className='relative list-none'>
          {experiences.map((experience, index) => (
            <TimelineEntry
              key={experience.id}
              experience={experience}
              side={index % 2 === 0 ? 'right' : 'left'}
              lit={index < litCount}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
