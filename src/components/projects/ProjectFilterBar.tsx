'use client';

import { Check, RotateCcw } from 'lucide-react';

import { ProjectTagLegend } from '@/components/projects/ProjectTagLegend';
import { ProjectToolsFilter } from '@/components/projects/ProjectToolsFilter';
import { Chip } from '@/components/ui/Chip';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import {
  DEFAULT_FILTERS,
  isDefaultFilters,
  type ProjectFilters,
  type ProjectView,
  toggleTag,
  toggleTool,
} from '@/lib/projects/filters';
import { cn } from '@/lib/utils';
import {
  type ProjectTag,
  type ProjectTool,
  TAG_META,
} from '@/types/projects/ProjectShowcase';

type ProjectFilterBarProps = {
  filters: ProjectFilters;
  onChange: (next: ProjectFilters) => void;
  /** Tags in use, in TAG_META order. */
  tags: ProjectTag[];
  /** Tools in use, sorted. */
  tools: ProjectTool[];
  countFor: (tool: ProjectTool) => number;
};

export function ProjectFilterBar({
  filters,
  onChange,
  tags,
  tools,
  countFor,
}: ProjectFilterBarProps) {
  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
      <ViewTabs
        value={filters.view}
        onChange={(view) => onChange({ ...filters, view })}
      />

      <div className='flex flex-wrap items-center gap-2'>
        {tags.map((tag) => (
          <TagFilterChip
            key={tag}
            tag={tag}
            active={filters.tags.includes(tag)}
            onToggle={() => onChange(toggleTag(filters, tag))}
          />
        ))}
        {/* One explainer for the whole row, not one per chip. */}
        <ProjectTagLegend tags={tags} />
      </div>

      <ProjectToolsFilter
        tools={tools}
        selected={filters.tools}
        onToggle={(tool) => onChange(toggleTool(filters, tool))}
        countFor={countFor}
      />

      {/* Nothing to reset, nothing to render. */}
      {!isDefaultFilters(filters) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              onClick={() => onChange(DEFAULT_FILTERS)}
              aria-label='Clear all filters'
              className='text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
            >
              <RotateCcw className='size-4' aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent>Clear all filters</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

const VIEWS: { value: ProjectView; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'all', label: 'All' },
];

function ViewTabs({
  value,
  onChange,
}: {
  value: ProjectView;
  onChange: (view: ProjectView) => void;
}) {
  return (
    <div
      className='border-border flex shrink-0 rounded-md border p-0.5'
      role='group'
      aria-label='Which projects to show'
    >
      {VIEWS.map((view) => (
        <button
          key={view.value}
          type='button'
          aria-pressed={value === view.value}
          onClick={() => onChange(view.value)}
          className={cn(
            'focus-visible:ring-ring cursor-pointer rounded px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
            value === view.value
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

function TagFilterChip({
  tag,
  active,
  onToggle,
}: {
  tag: ProjectTag;
  active: boolean;
  onToggle: () => void;
}) {
  const { label, description } = TAG_META[tag];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Radix points aria-describedby at the tooltip while it's open, so
            the description is announced with the chip instead of being a
            separate stop. It opens on focus as well as hover — and the ⓘ at
            the end of the row has the same copy for anyone who can't. */}
        <Chip asChild variant={active ? 'active' : 'default'}>
          <button
            type='button'
            aria-pressed={active}
            onClick={onToggle}
            // A check plus the weight change, so the active state doesn't
            // rest on colour alone.
            className={cn(active && 'font-semibold')}
          >
            {active && <Check className='size-3' aria-hidden />}
            {label}
          </button>
        </Chip>
      </TooltipTrigger>
      {/* Wide enough that every tag description but No AI fits on one line,
          where w-fit hugs the text exactly. At the old max-w-60 the longer
          ones hit the clamp and sat in a box wider than their own text. */}
      <TooltipContent className='max-w-72'>{description}</TooltipContent>
    </Tooltip>
  );
}
