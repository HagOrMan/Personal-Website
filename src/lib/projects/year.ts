import type { ProjectYear } from '@/types/projects/ProjectShowcase';

export type ParsedProjectYear = {
  start: number;
  /** null while the project is still going. */
  end: number | null;
  ongoing: boolean;
};

/** Sorts ongoing projects above everything finished, without the NaN a
 * literal Infinity would produce when two of them meet in a comparator. */
const ONGOING_SORT_KEY = Number.MAX_SAFE_INTEGER;

export function parseProjectYear(value: ProjectYear): ParsedProjectYear {
  if (typeof value === 'number') {
    return { start: value, end: value, ongoing: false };
  }

  const [rawStart, rawEnd] = value.split('-');
  const start = Number(rawStart);

  if (!Number.isFinite(start)) {
    throw new Error(`[projects] Unreadable start year in "${value}".`);
  }

  if (rawEnd === 'present') {
    return { start, end: null, ongoing: true };
  }

  const end = Number(rawEnd);
  if (!Number.isFinite(end)) {
    throw new Error(`[projects] Unreadable end year in "${value}".`);
  }
  if (end < start) {
    throw new Error(`[projects] "${value}" ends before it starts.`);
  }

  return { start, end, ongoing: false };
}

/**
 * What the card shows. A range that starts and ends in the same year is just
 * that year — typing '2023-2023' and typing 2023 read the same on the page.
 */
export function formatProjectYear(value: ProjectYear): string {
  const { start, end, ongoing } = parseProjectYear(value);

  if (ongoing) return `${start}-Present`;
  if (end === start) return `${start}`;
  return `${start}-${end}`;
}

/**
 * Newest first, by the year the work last happened — so something still in
 * progress leads, and a project worked on through 2026 outranks one that
 * finished in 2024 even if it started earlier. Ties break on the later start.
 *
 * (If you'd rather rank by when a project *began*, this is the one function
 * to change.)
 */
export function compareProjectYears(a: ProjectYear, b: ProjectYear): number {
  const left = parseProjectYear(a);
  const right = parseProjectYear(b);

  const leftEnd = left.ongoing ? ONGOING_SORT_KEY : left.end!;
  const rightEnd = right.ongoing ? ONGOING_SORT_KEY : right.end!;

  if (leftEnd !== rightEnd) return rightEnd - leftEnd;
  return right.start - left.start;
}
