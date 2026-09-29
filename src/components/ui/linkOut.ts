import { cn } from '@/lib/utils';

/**
 * The quiet text link that closes a section and points somewhere else - "See
 * everything else" under the homepage ribbon, the LinkedIn link under the
 * recommendations, "All my music" on /about-me.
 *
 * Not an actionVariants variant: those carry a button's box (h-9, px-4,
 * rounded-lg), and this has to sit flush with the paragraph above it.
 *
 * Spacing, `cursor-newtab` and any `group/*` name belong to the call site.
 */
const linkOutBase =
  'text-breeze-900/80 hover:text-breeze-700 dark:text-breeze-300/75 dark:hover:text-breeze-300 inline-flex items-center gap-2 text-sm motion-safe:transition-colors';

export function linkOutClass(className?: string) {
  return cn(linkOutBase, className);
}
