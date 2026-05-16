'use client';

import * as React from 'react';

import {
  DEFAULT_VARIANT_ID,
  PROJECT_CARD_VARIANTS,
} from '@/constant/variants/projectCardVariants';
import { cn } from '@/lib/utils';
import { TProjectShowcase } from '@/types/projects/ProjectShowcase';

type Props = {
  variantId: string;
  projects: TProjectShowcase[];
};

// The transition has 3 phases: 'in' (visible), 'out' (exiting), 'enter' (entering)
type Phase = 'in' | 'out' | 'enter';

const EXIT_MS = 350;
const ENTER_MS = 450;

export function AnimatedProjectGrid({ variantId, projects }: Props) {
  const [displayedId, setDisplayedId] = React.useState(variantId);
  const [phase, setPhase] = React.useState<Phase>('in');

  React.useEffect(() => {
    if (variantId === displayedId) return;

    setPhase('out');
    const exitTimer = setTimeout(() => {
      setDisplayedId(variantId);
      setPhase('enter');

      const enterTimer = setTimeout(() => setPhase('in'), 20); // next frame
      return () => clearTimeout(enterTimer);
    }, EXIT_MS);

    return () => clearTimeout(exitTimer);
  }, [variantId, displayedId]);

  const active =
    PROJECT_CARD_VARIANTS.find((v) => v.id === displayedId) ??
    PROJECT_CARD_VARIANTS.find((v) => v.id === DEFAULT_VARIANT_ID)!;

  const { Component, extraProps = {} } = active;

  return (
    <div
      className='flex flex-wrap justify-center gap-4'
      style={
        {
          '--exit-ms': `${EXIT_MS}ms`,
          '--enter-ms': `${ENTER_MS}ms`,
        } as React.CSSProperties
      }
    >
      {projects.map((project, index) => (
        <AnimatedCard
          key={`${displayedId}-${index}`}
          phase={phase}
          index={index}
          total={projects.length}
        >
          <Component project={project} index={index} {...extraProps} />
        </AnimatedCard>
      ))}
    </div>
  );
}

function AnimatedCard({
  phase,
  index,
  total,
  children,
}: {
  phase: Phase;
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  // Stagger from the center outward for a satisfying cascade.
  const center = (total - 1) / 2;
  const distanceFromCenter = Math.abs(index - center);
  const stagger = distanceFromCenter * 40;

  // Alternate direction by index so cards fly out in opposite directions
  const direction = index % 2 === 0 ? -1 : 1;
  const verticalDrift = (index % 3) - 1; // -1, 0, or 1

  const baseStyle: React.CSSProperties = {
    transitionProperty: 'transform, opacity, filter',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: `${stagger}ms`,
  };

  let dynamicStyle: React.CSSProperties = {};

  if (phase === 'in') {
    dynamicStyle = {
      transform: 'translate3d(0, 0, 0) scale(1)',
      opacity: 1,
      filter: 'blur(0px)',
      transitionDuration: `var(--enter-ms)`,
    };
  } else if (phase === 'out') {
    dynamicStyle = {
      transform: `translate3d(${direction * 80}px, ${verticalDrift * 30}px, 0) scale(0.96)`,
      opacity: 0,
      filter: 'blur(6px)',
      transitionDuration: `var(--exit-ms)`,
    };
  } else if (phase === 'enter') {
    // Start state for incoming cards — no transition yet, just positioned off
    dynamicStyle = {
      transform: `translate3d(${-direction * 80}px, ${verticalDrift * 30}px, 0) scale(0.96)`,
      opacity: 0,
      filter: 'blur(6px)',
      transitionDuration: '0ms',
    };
  }

  return (
    <div
      className={cn('will-change-transform')}
      style={{ ...baseStyle, ...dynamicStyle }}
    >
      {children}
    </div>
  );
}
