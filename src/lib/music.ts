import { COMPOSITIONS } from '@/constant/music';
import manifest from '@/data/music.json';
import type { Composition, CompositionAssets } from '@/types/music';

const ASSETS = manifest as Record<string, CompositionAssets>;

/** Every authored piece, in display order, joined with its exported files. */
export const compositions: Composition[] = COMPOSITIONS.map((entry) => ({
  ...entry,
  assets: ASSETS[entry.slug] ?? null,
})).sort((a, b) => a.order - b.order);

export function getComposition(slug: string): Composition | undefined {
  return compositions.find((composition) => composition.slug === slug);
}
