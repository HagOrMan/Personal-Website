'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

import { ChevronDown } from 'lucide-react';

import { AnimatedProjectGrid } from '@/components/projects/AnimatedProjectGrid';
import { ProjectFilterBar } from '@/components/projects/ProjectFilterBar';
import { ProjectVariantPicker } from '@/components/projects/ProjectVariantPicker';
import { DEFAULT_VARIANT_ID } from '@/constant/variants/projectCardVariants';
import {
  applyFilters,
  collectTags,
  collectTools,
  countWithTool,
  DEFAULT_FILTERS,
  filtersToPath,
  parseFilters,
  type ProjectFilters,
  widestSingleRelease,
} from '@/lib/projects/filters';
import {
  type ProjectTool,
  TProjectShowcase,
} from '@/types/projects/ProjectShowcase';

/** Two full rows at three columns. Past that, the rest waits behind a toggle. */
const INITIAL_CARD_LIMIT = 6;

export default function ProjectsClient({
  projects,
}: {
  projects: TProjectShowcase[];
}) {
  const searchParams = useSearchParams();
  const [variantId, setVariantId] = React.useState(DEFAULT_VARIANT_ID);
  // A filtered view is shareable, so the URL is the source of truth on load.
  const [filters, setFilters] = React.useState<ProjectFilters>(() =>
    parseFilters(new URLSearchParams(searchParams.toString())),
  );
  const [expanded, setExpanded] = React.useState(false);

  const updateFilters = React.useCallback((next: ProjectFilters) => {
    setFilters(next);
    // replaceState rather than router.replace: filtering shouldn't spam
    // history (back should leave the page, not walk back through every chip)
    // and there's nothing on the server to re-render. Same call the blog
    // index makes for its tag filter.
    window.history.replaceState(null, '', filtersToPath(next));
  }, []);

  const tags = React.useMemo(() => collectTags(projects), [projects]);
  const tools = React.useMemo(() => collectTools(projects), [projects]);
  const matching = React.useMemo(
    () => applyFilters(projects, filters),
    [projects, filters],
  );
  const countFor = React.useCallback(
    (tool: ProjectTool) => countWithTool(projects, filters, tool),
    [projects, filters],
  );

  // Narrowing by tag or tool cuts the pool down enough that holding part of
  // the result back would just be confusing — it forces everything open.
  const narrowed = filters.tags.length > 0 || filters.tools.length > 0;
  const showingAll = expanded || narrowed;
  const shown = showingAll ? matching : matching.slice(0, INITIAL_CARD_LIMIT);
  const shownSlugs = new Set(shown.map((project) => project.slug));
  const overflowCount = matching.length - INITIAL_CARD_LIMIT;
  const hasOverflow = !narrowed && overflowCount > 0;

  // Only computed for the empty state, where it powers "Try removing Java".
  const release =
    matching.length === 0 ? widestSingleRelease(projects, filters) : null;

  return (
    <>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
        <ProjectFilterBar
          filters={filters}
          onChange={updateFilters}
          tags={tags}
          tools={tools}
          countFor={countFor}
        />
        <ProjectVariantPicker value={variantId} onChange={setVariantId} />
      </div>

      {/* Filtering is silent otherwise — this is the only signal a screen
          reader gets that the grid behind the controls has changed. */}
      <p aria-live='polite' className='sr-only'>
        {matching.length === 0
          ? 'No projects match'
          : `${matching.length} ${matching.length === 1 ? 'project' : 'projects'}`}
      </p>

      {matching.length === 0 ? (
        <div className='flex flex-col items-center gap-4 py-16 text-center'>
          <p className='text-muted-foreground'>
            Whoopsies! No projects match that combination.
          </p>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            <button
              type='button'
              onClick={() => updateFilters(DEFAULT_FILTERS)}
              className='border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
            >
              Clear all filters
            </button>
            {release && (
              <button
                type='button'
                onClick={() => updateFilters(release.next)}
                className='text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-pointer rounded-md px-3 py-1.5 text-sm underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
              >
                Try removing {release.label}
              </button>
            )}
          </div>
        </div>
      ) : (
        <AnimatedProjectGrid
          variantId={variantId}
          projects={projects}
          shownSlugs={shownSlugs}
          mode='checkerboard'
        />
      )}

      {hasOverflow && (
        <div className='mt-6 flex justify-center'>
          <button
            type='button'
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className='group hover:text-primary text-muted-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
          >
            <ChevronDown
              className={`size-4 shrink-0 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
              aria-hidden
            />
            {expanded ? 'Show fewer' : `View all projects (+${overflowCount})`}
          </button>
        </div>
      )}
    </>
  );
}
