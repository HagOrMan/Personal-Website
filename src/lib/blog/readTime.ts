// Average adult silent reading speed for prose; used to turn a post's word
// count into a rough "N minute read" estimate.
const WORDS_PER_MINUTE = 220;

// Raw markdown source over-counts "words" - code fences, link syntax, and
// heading hashes all split on whitespace but aren't prose. Scaling the raw
// count down brings the estimate back in line with what the reader actually
// reads.
const MARKDOWN_NOISE_FACTOR = 0.9;

/**
 * Estimates reading time in minutes from raw text (markdown source is fine -
 * this is an estimate, not a precise count). Always at least 1 minute.
 */
export function estimateReadTime(text: string, wpm = WORDS_PER_MINUTE): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil((words * MARKDOWN_NOISE_FACTOR) / wpm);
  return Math.max(minutes, 1);
}
