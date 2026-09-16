import { projects } from '@/constant/projects';
import { type Experience, sortedExperiences } from '@/data/experiences';
import type { HomeSlot } from '@/types/home';
import type { TProjectShowcase } from '@/types/projects/ProjectShowcase';

/** An entry that has claimed a slot, with `homeSlot` narrowed to present. */
type Slotted<T> = T & { homeSlot: HomeSlot };

function hasSlot<T extends { homeSlot?: HomeSlot }>(
  item: T,
): item is Slotted<T> {
  return item.homeSlot !== undefined;
}

/**
 * The entries claiming a homepage slot, in slot order.
 *
 * Two entries sharing a slot throws rather than resolving: the alternative is
 * a silent tiebreak on authored order, which would mean the homepage quietly
 * reordering itself because of an edit made somewhere else in the file for an
 * unrelated reason. Same spirit as assertProjectRoutesExist — a mistake in
 * this config should surface while building, not on the page.
 *
 * Both source lists arrive pre-sorted (by date, by year), and both orders are
 * discarded here. That's the point of the field: see types/home.ts.
 */
function bySlot<T extends { homeSlot?: HomeSlot }>(
  items: T[],
  source: string,
  describe: (item: T) => string,
): Slotted<T>[] {
  const claimed = items.filter(hasSlot);

  const taken = new Map<HomeSlot, string>();
  for (const item of claimed) {
    const conflict = taken.get(item.homeSlot);
    if (conflict !== undefined) {
      throw new Error(
        `[home] ${describe(item)} and ${conflict} both claim homeSlot ${item.homeSlot}. ` +
          `Give one of them the other slot, or drop its homeSlot, in ${source}.`,
      );
    }
    taken.set(item.homeSlot, describe(item));
  }

  return [...claimed].sort((a, b) => a.homeSlot - b.homeSlot);
}

export const homeExperiences: Slotted<Experience>[] = bySlot(
  sortedExperiences,
  'src/data/experiences.ts',
  (experience) => experience.id,
);

export const homeProjects: Slotted<TProjectShowcase>[] = bySlot(
  projects,
  'src/constant/projects.ts',
  (project) => project.slug,
);
