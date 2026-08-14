import type { PostMeta } from '@/lib/blog/github';

// The shape a hover preview renders. Intentionally a narrow projection of
// PostMeta rather than PostMeta itself: previews get serialized into client
// components on several pages, and the fewer fields that cross that boundary
// the less there is to audit when PostMeta grows.

export interface PostPreview {
  slug: string;
  title: string;
  /** Authored description when there is one, otherwise an opening snippet. */
  summary?: string;
  date?: string;
  readTimeMinutes: number;
  locked: boolean;
  tags?: string[];
}

/** Keyed by canonical slug. */
export type PostPreviewMap = Record<string, PostPreview>;

/**
 * Prefers the authored `description` over the generated excerpt. The
 * description is a summary written to answer "is this post for me?", while a
 * post's opening line is usually a hook - it reads well but tells a hovering
 * reader much less. The excerpt only fills in where no description exists, so
 * a preview is never blank.
 *
 * Locked posts carry no excerpt at all (see toPostMeta), so their summary is
 * either the authored description or nothing - the body stays behind the wall.
 */
export function toPostPreview(meta: PostMeta): PostPreview {
  return {
    slug: meta.slug,
    title: meta.title,
    summary: meta.description ?? meta.excerpt,
    date: meta.date,
    readTimeMinutes: meta.readTimeMinutes,
    locked: meta.locked,
    tags: meta.tags,
  };
}

export function buildPreviewMap(posts: PostMeta[]): PostPreviewMap {
  const map: PostPreviewMap = {};
  for (const meta of posts) {
    map[meta.slug] = toPostPreview(meta);
  }
  return map;
}

// Matches the slug in any same-origin post URL, in markdown link targets and
// raw HTML hrefs alike. Trailing characters (#anchor, ?query, quotes) simply
// fall outside the capture.
const INTERNAL_POST_URL_RE = /\/blog\/([A-Za-z0-9_-]+)/g;

/**
 * Every distinct post slug linked from `markdown`. Used to decide whether a
 * post needs the full index loaded for previews at all - most posts link to
 * none, and this keeps those pages from paying for a listPosts() call.
 */
export function collectLinkedPostSlugs(markdown: string): string[] {
  const slugs = new Set<string>();
  for (const match of markdown.matchAll(INTERNAL_POST_URL_RE)) {
    slugs.add(match[1]!);
  }
  return [...slugs];
}

/**
 * The post slug an href points at, or null if it isn't an internal post link.
 * Relative hrefs are resolved against a dummy origin so "#anchor" and
 * "../elsewhere" can't be mistaken for post links.
 */
export function internalPostSlug(href: string | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid') return null;
    const match = /^\/blog\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
    return match ? match[1]! : null;
  } catch {
    return null;
  }
}
