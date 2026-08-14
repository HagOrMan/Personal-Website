// Turns raw markdown into a short plain-text snippet, used as the fallback
// body of a post hover preview when a post has no authored `description`.
//
// This is deliberately a crude strip rather than a real markdown parse: the
// output is a one-line teaser, so the only requirement is that no syntax
// leaks into it. Anything this misses degrades to a stray character in a
// preview card, never to broken markup.

const EXCERPT_LENGTH = 180;

// Below this fraction of the budget a sentence break is too early to be worth
// taking - cutting there would throw away most of the excerpt, so we fall
// back to a word break near the end instead.
const MIN_SENTENCE_BREAK_RATIO = 0.5;

/**
 * Strips markdown (and the raw HTML posts are allowed to contain) down to
 * plain prose. Order matters: fenced code goes first so its contents can
 * never reach the output, and inline emphasis marks go last so the earlier
 * line-anchored patterns still see their original leading characters.
 */
function toPlainText(markdown: string): string {
  return (
    markdown
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/~~~[\s\S]*?~~~/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Posts use <details>, <sup> and friends - drop the tags, keep the text.
      .replace(/<[^>]+>/g, ' ')
      // Images before links: an image's alt text isn't prose, but its syntax
      // would otherwise match the link pattern and survive as bare alt text.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}>[ \t]?/gm, '')
      .replace(/^\s{0,3}#{1,6}[ \t]+/gm, '')
      .replace(/^\s{0,3}([-*+]|\d+[.)])[ \t]+/gm, '')
      .replace(/^\s{0,3}([-*_])(\s*\1){2,}\s*$/gm, ' ')
      .replace(/[*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * A short plain-text opening snippet for `markdown`, or undefined when the
 * post has no prose at all. Cuts on a sentence boundary when one falls
 * reasonably near the budget, otherwise on a word boundary with an ellipsis.
 */
export function extractExcerpt(
  markdown: string,
  maxLength = EXCERPT_LENGTH,
): string | undefined {
  const text = toPlainText(markdown);
  if (!text) return undefined;
  if (text.length <= maxLength) return text;

  // One char past the budget, so a sentence ending exactly at the limit is
  // still visible to the search below.
  const window = text.slice(0, maxLength + 1);

  const sentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
  );
  if (sentenceEnd >= maxLength * MIN_SENTENCE_BREAK_RATIO) {
    return window.slice(0, sentenceEnd + 1);
  }

  const wordEnd = window.lastIndexOf(' ');
  return `${window.slice(0, wordEnd > 0 ? wordEnd : maxLength).trimEnd()}…`;
}
