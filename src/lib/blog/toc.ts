import GithubSlugger from 'github-slugger';

// Builds a table of contents from a post's raw markdown, server-side.
//
// The ids here must match, character for character, the ones rehypeSlug puts
// on the rendered headings - otherwise every link in the list is a dead
// anchor. rehypeSlug (see the plugin list in app/blog/[slug]/page.tsx) uses a
// single GithubSlugger per document, reset up front, and slugs every heading
// h1-h6 in document order off its rendered *text* content. Two consequences
// this file has to honour:
//
//   1. Headings deeper than the ones we display still consume slugs, because
//      the slugger's duplicate counter is shared ("Setup", "Setup" -> `setup`,
//      `setup-1`). So we walk every level and only filter at the end.
//   2. The text we slug has to be the text the reader sees, not the markdown
//      source - `## Using **venv**` renders as "Using venv" and slugs as
//      `using-venv`, so inline syntax is stripped before slugging.
//
// This reads the markdown source rather than the rendered tree, which means
// headings written as raw HTML (<h2>Foo</h2>) are invisible to it. Posts here
// are authored with `#` headings, so that's an accepted gap rather than a bug.

export interface TocHeading {
  /** Matches the `id` rehypeSlug puts on the rendered heading. */
  id: string;
  /** Heading text as rendered, with inline markdown stripped. */
  text: string;
  /** Indent level relative to the shallowest heading in the post (0-2). */
  depth: number;
}

/** Below this, a list of links is noise rather than navigation. */
const MIN_HEADINGS = 3;

/** Deepest heading level that earns a spot in the list. */
const MAX_LEVEL = 3;

/** ``` or ~~~ - opens or closes a fenced code block. */
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * An ATX heading. CommonMark allows up to three leading spaces, requires
 * whitespace after the hashes (so `#hashtag` is a paragraph, not a heading),
 * and permits an empty heading (`##` alone).
 */
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;

/** The optional closing run of hashes in `## Heading ##`. */
const CLOSING_HASHES = /[ \t]+#+[ \t]*$/;

/**
 * Reduces a heading's markdown source to the text it renders as.
 *
 * Only two things genuinely need care. Links have to give up their text and
 * drop their target, or the URL leaks into the slug. And underscores are
 * load-bearing: GitHub's slugger keeps them (`__init__.py` -> `initpy`), so
 * `_emphasis_` markers are only stripped at word boundaries, exactly where
 * CommonMark treats them as emphasis. Everything else here (`*`, `~`,
 * backticks, backslashes, angle brackets) is punctuation the slugger discards
 * anyway, so removing the characters outright lands on the same slug.
 */
function stripInlineMarkdown(source: string): string {
  return (
    source
      // ![alt](src) -> alt, before links so the leading `!` doesn't survive
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // [text](href) -> text, [text][ref] -> text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
      .replace(/`/g, '')
      // __strong__ / _emphasis_, word-bounded so snake_case survives. The
      // leading boundary is captured rather than looked behind - lookbehind
      // needs an ES2018 target and this project builds at ES2017.
      .replace(/(^|[^A-Za-z0-9_])__(?=\S)([\s\S]*?\S)__(?![A-Za-z0-9_])/g, '$1$2')
      .replace(/(^|[^A-Za-z0-9_])_(?=\S)([\s\S]*?\S)_(?![A-Za-z0-9_])/g, '$1$2')
      .replace(/[*~]/g, '')
      // HTML tags, but not autolinks like <https://example.com>
      .replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>/g, '')
      .replace(/\\/g, '')
      .trim()
  );
}

interface RawHeading {
  id: string;
  text: string;
  level: number;
}

/** Every h1-h3 in the post, slugged in lockstep with rehypeSlug. */
function collectHeadings(markdown: string): RawHeading[] {
  const slugger = new GithubSlugger();
  const headings: RawHeading[] = [];

  // Tracks the character that opened the current fence, so a ``` inside a
  // ~~~ block doesn't close it. `# comment` lines in shell samples are the
  // reason this matters at all.
  let openFence: string | null = null;

  for (const line of markdown.split('\n')) {
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1][0];
      if (openFence === null) openFence = marker;
      else if (openFence === marker) openFence = null;
      continue;
    }
    if (openFence !== null) continue;

    const match = ATX_HEADING.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = stripInlineMarkdown((match[2] ?? '').replace(CLOSING_HASHES, ''));

    // Slug unconditionally, even for headings we won't show or that are
    // empty - the duplicate counter has to stay in step with rehypeSlug.
    const id = slugger.slug(text);

    if (level <= MAX_LEVEL && text) headings.push({ id, text, level });
  }

  return headings;
}

/**
 * The table of contents for a post, or an empty list when there isn't enough
 * structure to be worth showing one. Callers render nothing on an empty
 * result. Depth is normalized against the shallowest heading present, so a
 * post written entirely in `#` reads as a flat list rather than everything
 * being indented two levels deep.
 */
export function extractTocHeadings(markdown: string): TocHeading[] {
  const headings = collectHeadings(markdown);
  if (headings.length < MIN_HEADINGS) return [];

  const shallowest = Math.min(...headings.map((heading) => heading.level));

  return headings.map(({ id, text, level }) => ({
    id,
    text,
    depth: Math.min(level - shallowest, 2),
  }));
}
