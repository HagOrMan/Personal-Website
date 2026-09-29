import type { Composition } from '@/types/music';

// Pure helpers, kept apart from lib/music.ts so client components can use
// them without bundling every composition's writeup.

export function compositionHref(composition: Pick<Composition, 'slug'>) {
  return `/music/${composition.slug}`;
}

/** Instrumentation, year and (once exported) length, for a byline. */
export function compositionFacts(composition: Composition): string[] {
  return [
    composition.instrumentation,
    String(composition.year),
    ...(composition.assets
      ? [formatDuration(composition.assets.durationSeconds)]
      : []),
  ];
}

/** "3:07" */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

/** ISO 8601 duration for JSON-LD, e.g. "PT3M7S". */
export function isoDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `PT${Math.floor(whole / 60)}M${whole % 60}S`;
}

/**
 * Blank lines separate paragraphs; single newlines stay inside a paragraph
 * and are rendered as line breaks by `whitespace-pre-line`.
 */
export function writeupParagraphs(writeup: string): string[] {
  return writeup
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** The writeup's opening, flattened and trimmed to a meta description. */
export function writeupExcerpt(writeup: string, max = 160): string {
  const first = (writeupParagraphs(writeup)[0] ?? '').replace(/\s+/g, ' ');
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}
