import {
  type ProjectTag,
  type ProjectTool,
  TAG_META,
  TAG_ORDER,
  TOOLS,
  type TProjectShowcase,
} from '@/types/projects/ProjectShowcase';

import { PROJECTS_BASE_PATH } from './paths';

export type ProjectView = 'featured' | 'all';

export type ProjectFilters = {
  view: ProjectView;
  tags: ProjectTag[];
  tools: ProjectTool[];
};

/** Featured is a filter, not a tab — it composes with the rest via AND. */
export const DEFAULT_FILTERS: ProjectFilters = {
  view: 'featured',
  tags: [],
  tools: [],
};

export function isDefaultFilters(filters: ProjectFilters): boolean {
  return (
    filters.view === DEFAULT_FILTERS.view &&
    filters.tags.length === 0 &&
    filters.tools.length === 0
  );
}

export function matchesFilters(
  project: TProjectShowcase,
  filters: ProjectFilters,
): boolean {
  if (filters.view === 'featured' && !project.featured) return false;
  // AND across every active tag and tool: a project must carry all of them.
  if (!filters.tags.every((tag) => project.tags.includes(tag))) return false;
  if (!filters.tools.every((tool) => project.tools.includes(tool))) return false;
  return true;
}

export function applyFilters(
  projects: TProjectShowcase[],
  filters: ProjectFilters,
): TProjectShowcase[] {
  return projects.filter((project) => matchesFilters(project, filters));
}

/** Only tags something is actually tagged with — a chip that can only ever
 * return nothing is noise. Declaration order from TAG_META is preserved. */
export function collectTags(projects: TProjectShowcase[]): ProjectTag[] {
  return TAG_ORDER.filter((tag) =>
    projects.some((project) => project.tags.includes(tag)),
  );
}

/** Every tool in use, deduplicated and sorted alphabetically. */
export function collectTools(projects: TProjectShowcase[]): ProjectTool[] {
  return [...new Set(projects.flatMap((project) => project.tools))].sort(
    (a, b) => a.localeCompare(b),
  );
}

/**
 * How many projects would match if `tool` were added to the current selection.
 *
 * Counted against `view: 'all'` whenever Featured is on, because activating a
 * tool auto-switches to All (see toggleTool) — so this is the number you'll
 * actually land on, not the number inside the featured subset.
 */
export function countWithTool(
  projects: TProjectShowcase[],
  filters: ProjectFilters,
  tool: ProjectTool,
): number {
  const after = withAutoSwitch({
    ...filters,
    tools: filters.tools.includes(tool)
      ? filters.tools
      : [...filters.tools, tool],
  });
  return applyFilters(projects, after).length;
}

/**
 * Narrowing a filter while Featured is selected silently switches to All.
 * Filtering by Python inside a 3-project featured set makes it look like there
 * are only 3 Python projects. Turning a filter *off* never switches back.
 */
function withAutoSwitch(filters: ProjectFilters): ProjectFilters {
  return filters.view === 'featured' ? { ...filters, view: 'all' } : filters;
}

export function toggleTag(
  filters: ProjectFilters,
  tag: ProjectTag,
): ProjectFilters {
  if (filters.tags.includes(tag)) {
    return { ...filters, tags: filters.tags.filter((it) => it !== tag) };
  }
  return withAutoSwitch({ ...filters, tags: [...filters.tags, tag] });
}

export function toggleTool(
  filters: ProjectFilters,
  tool: ProjectTool,
): ProjectFilters {
  if (filters.tools.includes(tool)) {
    return { ...filters, tools: filters.tools.filter((it) => it !== tool) };
  }
  return withAutoSwitch({ ...filters, tools: [...filters.tools, tool] });
}

/**
 * The single filter whose removal opens the results back up the most, for the
 * empty state's "Try removing Java" hint. Returns null when dropping any one
 * filter still leaves nothing — at that point there's no useful advice beyond
 * the Clear all button.
 */
export function widestSingleRelease(
  projects: TProjectShowcase[],
  filters: ProjectFilters,
): { label: string; next: ProjectFilters } | null {
  const candidates: { label: string; next: ProjectFilters }[] = [
    ...filters.tags.map((tag) => ({
      label: TAG_META[tag].label,
      next: { ...filters, tags: filters.tags.filter((it) => it !== tag) },
    })),
    ...filters.tools.map((tool) => ({
      label: tool,
      next: { ...filters, tools: filters.tools.filter((it) => it !== tool) },
    })),
  ];

  let best: { label: string; next: ProjectFilters; count: number } | null = null;
  for (const candidate of candidates) {
    const count = applyFilters(projects, candidate.next).length;
    if (count > 0 && (best === null || count > best.count)) {
      best = { ...candidate, count };
    }
  }

  return best ? { label: best.label, next: best.next } : null;
}

// ── URL serialisation ────────────────────────────────────────────────────────
// /projects?view=all&tags=fullstack,no-ai&tools=Python,React

const isProjectTag = (value: string): value is ProjectTag =>
  Object.prototype.hasOwnProperty.call(TAG_META, value);

const isProjectTool = (value: string): value is ProjectTool =>
  (TOOLS as readonly string[]).includes(value);

function splitParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Unknown values are ignored rather than treated as an error — a stale link
 * naming a renamed tool should still open the page. */
export function parseFilters(params: URLSearchParams): ProjectFilters {
  return {
    view: params.get('view') === 'all' ? 'all' : 'featured',
    tags: [...new Set(splitParam(params.get('tags')).filter(isProjectTag))],
    tools: [...new Set(splitParam(params.get('tools')).filter(isProjectTool))],
  };
}

/**
 * The path + query for a filter state, ready for history.replaceState.
 * Defaults are omitted so the plain /projects URL stays clean.
 *
 * Built by hand rather than with URLSearchParams.toString() so the separating
 * commas survive as commas instead of being escaped to %2C.
 */
export function filtersToPath(filters: ProjectFilters): string {
  const parts: string[] = [];
  if (filters.view !== 'featured') parts.push(`view=${filters.view}`);
  if (filters.tags.length > 0) {
    parts.push(`tags=${filters.tags.map(encodeURIComponent).join(',')}`);
  }
  if (filters.tools.length > 0) {
    parts.push(`tools=${filters.tools.map(encodeURIComponent).join(',')}`);
  }
  return parts.length > 0
    ? `${PROJECTS_BASE_PATH}?${parts.join('&')}`
    : PROJECTS_BASE_PATH;
}
