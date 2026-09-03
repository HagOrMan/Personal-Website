'use client';

import { useEffect, useRef } from 'react';

import { useScroll, useSpring } from 'motion/react';

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

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: RAIL_SCROLL_OFFSET,
  });
  const progress = useSpring(scrollYProgress, RAIL_SPRING);

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
      // One dispatch per frame, and outside the observer callback, so a
      // listener that reads layout can't feed straight back into the observer.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        window.dispatchEvent(new Event('resize')),
      );
    });

    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Declaration order from KIND_LABELS, narrowed to the kinds actually used -
  // so the legend never advertises a shape that isn't on the page.
  const kindsPresent = (Object.keys(KIND_LABELS) as ExperienceKind[]).filter(
    (kind) => experiences.some((experience) => experience.kind === kind),
  );

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-5xl',
        // Insurance for the narrowest screens: the media swings in from 32px
        // out and rotates on the way, and on a ~320px viewport the card is
        // wide enough that the overshoot gets close to the page edge. `clip`
        // rather than `hidden` so this never becomes a scroll container, and
        // only below md - on a desktop the container has hundreds of pixels
        // of slack either side, so clipping there would only cost us the
        // overhang the gesture is made of.
        'overflow-x-clip md:overflow-x-visible',
      )}
    >
      <TimelineLegend kinds={kindsPresent} labels={KIND_LABELS} />

      <div ref={containerRef} className='relative'>
        <TimelineRail progress={progress} />

        {/* A real sequence, so it says so. Sides alternate at md and up; below
            that TimelineEntry pins every card to the right of the rail. */}
        <ol className='relative list-none'>
          {experiences.map((experience, index) => (
            <TimelineEntry
              key={experience.id}
              experience={experience}
              side={index % 2 === 0 ? 'right' : 'left'}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
