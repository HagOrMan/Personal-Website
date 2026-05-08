'use client';

import { cn } from '@/lib/utils';
import { TProjectShowcaseCard } from '@/types/projects/ProjectShowcase';

import { LiquidGlassCard } from '../ui/LiquidGlassCard';

export const ProjectShowcaseCard = ({
  project,
  index,
  className,
}: TProjectShowcaseCard) => {
  return (
    <div id={`${index}`} className={cn('', className)}>
      <LiquidGlassCard>
        <h2>{project.name}</h2>
        <span>{project.description}</span>
      </LiquidGlassCard>
    </div>
  );
};
