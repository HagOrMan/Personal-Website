import matter from 'gray-matter';

import { formatTitle, slugify } from '@/lib/blog/slug';
import {
  blobUrl,
  type ContentSource,
  contentSources,
  isExcluded,
  joinPath,
} from '@/lib/blog/sources';
import { withStaleFallback } from '@/lib/blog/staleCache';
import { requiredEnv } from '@/lib/env';

import 'server-only';

// Content is read from one or more GitHub repos declared in lib/blog/sources.
// Within a source:
//   <postsDir>/[fileName].md   - markdown files, optionally nested in
//                                subfolders (e.g. posts/EventReflections/*.md).
//                                The subfolder never appears in the slug/URL,
//                                but it does surface as PostMeta.folder so the
//                                index can group posts by it.
//   <assetsDir>/[slug]/...     - per-post assets, a sibling of postsDir, keyed
//                                by the canonical slug (not the subfolder
//                                path). Sources with no assetsDir link their
//                                non-markdown files straight to GitHub
//                                instead - see rewriteContentPaths.
//
// Post file names can be kebab-case ("my-first-post.md") or PascalCase
// ("MyFirstPost.md") - either resolves to the same canonical kebab-case
// slug (see lib/blog/slug.ts), so bookmarked/typed URLs in any case still
// land on the right post. The page layer 308-redirects non-canonical
// requests to the canonical slug. Slugs are a single flat namespace across
// every source; sources are tried in order, so the private blog repo wins
// any collision and listPosts logs the loser.
//
// All reads go through the GitHub Contents API using a read-only fine-grained
// PAT. (Fine-grained PATs always carry read-only access to public repos, so
// the same token covers public sources without being scoped to them - it just
// buys the authenticated rate limit.) Nothing here ever runs on the client -
// this module must only be imported from Server Components, Route Handlers,
// or Server Actions.

const GITHUB_API = 'https://api.github.com';

// Canonical, post-normalization form.
const SLUG_RE = /^[a-z0-9-]+$/;
// What we accept for a single path segment before normalizing (still
// blocks traversal - '.' isn't in the allowed set, so '..' can never match).
const SLUG_PARAM_RE = /^[A-Za-z0-9_-]+$/;
const ASSET_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

function isValidSlugParam(segment: string): boolean {
  return SLUG_PARAM_RE.test(segment);
}

/** Validates every segment of a (possibly nested) post path. */
function isValidPostPath(postPath: string): boolean {
  return postPath.split('/').every(isValidSlugParam);
}

export function isValidAssetPath(segments: string[]): boolean {
  return (
    segments.length > 0 &&
    segments.every((segment) => segment !== '..' && ASSET_SEGMENT_RE.test(segment))
  );
}

interface PostFrontmatter {
  title?: string;
  date?: string;
  description?: string;
  password?: string;
  private?: boolean;
  tags?: string[];
  featured?: boolean | 'top';
  toc?: boolean;
  [key: string]: unknown;
}

/** Safe to render/serialize to the client - never carries `password`. */
export interface PostMeta {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  tags?: string[];
  /** Human-readable subfolder label (e.g. "Event Reflections"), if nested. */
  folder?: string;
  locked: boolean;
  featured: boolean;
  /** `featured: top` - leads the featured section instead of being tucked under "view all". */
  featuredTop: boolean;
  /**
   * Whether the post wants a table of contents. On by default - `toc: false`
   * opts out a post whose headings are reference anchors rather than sections,
   * or one that already hand-rolls its own quick links.
   */
  toc: boolean;
  /** ContentSource id this post was read from. */
  source: string;
  /** Label of the repo the post lives in - only set when it's publicly browsable. */
  sourceLabel?: string;
  /** Direct GitHub URL to the markdown file, when the source is public. */
  sourceUrl?: string;
}

export interface Post {
  meta: PostMeta;
  content: string;
  /**
   * Server-only rendering context - the source this post came from and its
   * path within that source's postsDir. Needed to rewrite relative links and
   * to decide whether the content needs sanitizing. Never pass to a client
   * component; pass `meta` instead.
   */
  source: ContentSource;
  postPath: string;
}

export interface AssetFile {
  bytes: Uint8Array;
  contentType: string;
}

function contentsUrl(source: ContentSource, path: string): string {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${GITHUB_API}/repos/${source.owner}/${source.repo}/contents/${encodedPath}`;
}

function githubHeaders(accept: string): HeadersInit {
  return {
    Authorization: `Bearer ${requiredEnv('BLOG_PAT_TOKEN')}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function isLocked(fm: PostFrontmatter): boolean {
  return Boolean(fm.password) || fm.private === true;
}

function isFeatured(fm: PostFrontmatter): boolean {
  return fm.featured === true || fm.featured === 'top';
}

function isFeaturedTop(fm: PostFrontmatter): boolean {
  return fm.featured === 'top';
}

// Frontmatter keys that control *access* rather than presentation. An
// untrusted source takes outside pull requests, so a merged contribution must
// never be able to lock content behind a password or hide it from the index -
// both fail silently, which is what makes them worth blocking outright.
//
// `featured` is deliberately NOT on this list: the worst it can do is put a
// tutorial at the top of the index, which is loudly visible on the very next
// page load, and blocking it would also stop the owner from ever featuring
// their own tutorial. Same for `toc`: hiding a post's own table of contents is
// purely presentational and only ever affects that one post.
const CONTROL_FRONTMATTER = ['password', 'private'] as const;

function applySourcePolicy(
  source: ContentSource,
  fm: PostFrontmatter,
): PostFrontmatter {
  if (source.trusted) return fm;
  const safe = { ...fm };
  for (const key of CONTROL_FRONTMATTER) delete safe[key];
  return safe;
}

// Obsidian "parent node" notes exist purely to organize sub-notes in the
// vault - they're never a real post, so they 404 everywhere (index, direct
// URL, unlock action, assets).
const PARENT_NODE_TAG = 'obsidian-parent-node';

/** Frontmatter tags as a clean string array (always authored as a YAML list). */
function normalizeTags(tags: unknown): string[] | undefined {
  if (!Array.isArray(tags)) return undefined;
  const cleaned = tags.filter(
    (tag): tag is string => typeof tag === 'string' && tag.length > 0,
  );
  return cleaned.length > 0 ? cleaned : undefined;
}

function isParentNode(fm: PostFrontmatter): boolean {
  return normalizeTags(fm.tags)?.includes(PARENT_NODE_TAG) ?? false;
}

/**
 * A post's own tags plus its source's defaults, deduped. Deliberately separate
 * from normalizeTags(), so a source default can never make a post look like a
 * parent node.
 *
 * Order matters: the blog index only shows a post's first few tags, and a
 * source default is identical across every post from that source (every
 * Tutorials post is tagged "tutorial"), so the post's own - more distinctive -
 * tags go first.
 */
function mergeTags(
  source: ContentSource,
  fm: PostFrontmatter,
): string[] | undefined {
  const merged = [
    ...(normalizeTags(fm.tags) ?? []),
    ...(source.defaultTags ?? []),
  ];
  const unique = [...new Set(merged)];
  return unique.length > 0 ? unique : undefined;
}

/** The slug/title are always derived from the file name alone, never the subfolder. */
function lastSegment(postPath: string): string {
  return postPath.split('/').pop()!;
}

/** "EventReflections" -> "Event Reflections", "event-reflections" too. */
function formatFolderLabel(segment: string): string {
  return formatTitle(segment.replace(/[-_]+/g, ' '))
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The index's grouping label. A source's folderPrefix leads, so a source whose
 * markdown sits at the repo root still gets its own group rather than falling
 * into "General" alongside the blog's own top-level posts.
 */
function toFolderLabel(
  source: ContentSource,
  segments: string[],
): string | undefined {
  const parts = [source.folderPrefix, ...segments.map(formatFolderLabel)].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(' / ') : undefined;
}

function toPostMeta(
  source: ContentSource,
  postPath: string,
  fm: PostFrontmatter,
): PostMeta {
  const segments = postPath.split('/');
  const fileName = segments.pop()!;
  return {
    slug: slugify(fileName),
    title: fm.title ?? formatTitle(fileName),
    date: fm.date,
    description: fm.description,
    tags: mergeTags(source, fm),
    folder: toFolderLabel(source, segments),
    locked: isLocked(fm),
    featured: isFeatured(fm),
    featuredTop: isFeaturedTop(fm),
    toc: fm.toc !== false,
    source: source.id,
    sourceLabel: source.publicUrl ? source.label : undefined,
    sourceUrl: blobUrl(source, `${joinPath(source.postsDir, postPath)}.md`),
  };
}

interface RawPostFile {
  frontmatter: PostFrontmatter;
  content: string;
}

interface DirEntry {
  name: string;
  type: string;
}

/**
 * Lists one directory level. A 404 (directory doesn't exist, e.g. a fresh
 * repo with no posts yet) is a legitimate empty result. Any other failure
 * throws so withStaleFallback can serve the last successful listing instead
 * of silently reporting "no posts."
 */
async function listDirEntries(
  source: ContentSource,
  path: string,
): Promise<DirEntry[]> {
  return withStaleFallback(`dir:${source.id}:${path}`, async () => {
    const res = await fetch(contentsUrl(source, path), {
      headers: githubHeaders('application/vnd.github+json'),
      next: { tags: ['blog'], revalidate: 300 },
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Failed to list "${source.id}:${path}"`);
    return (await res.json()) as DirEntry[];
  });
}

/**
 * Recursively walks a source's postsDir (and any subfolders) for markdown
 * files, yielding paths relative to postsDir. One Contents API call per
 * directory - cheap for a personal blog's post count, and cached the same as
 * everything else via the 'blog' tag. Excluded paths are skipped before the
 * call, so naming a directory in `exclude` costs nothing to walk. A failure in
 * one subfolder (after exhausting its own stale fallback) doesn't take down
 * discovery of every other post - it's just skipped and logged.
 */
async function walkPosts(
  source: ContentSource,
  relDir: string,
): Promise<string[]> {
  const entries = await listDirEntries(source, joinPath(source.postsDir, relDir));

  const results = await Promise.allSettled(
    entries.map(async (entry): Promise<string[]> => {
      const relPath = joinPath(relDir, entry.name);
      if (isExcluded(source, relPath)) return [];
      if (entry.type === 'file' && entry.name.endsWith('.md')) return [relPath];
      if (entry.type === 'dir') return walkPosts(source, relPath);
      return [];
    }),
  );

  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value;
    console.error(
      `[blog] Failed to walk "${source.id}:${relDir}", skipping`,
      result.reason,
    );
    return [];
  });
}

/**
 * Every post's path relative to the source's postsDir, without the .md
 * extension - e.g. "my-first-post" or "EventReflections/my-trip".
 */
async function listPostPaths(source: ContentSource): Promise<string[]> {
  const paths = await walkPosts(source, '');
  return paths
    .map((path) => path.slice(0, -'.md'.length))
    .filter(isValidPostPath);
}

/**
 * Fetches and parses a single post file by its path relative to postsDir
 * (not yet slug-normalized, may include a subfolder). Returns null when the
 * path is excluded or 404s, so callers can decide how to surface "not found"
 * for their context. The exclusion check lives here rather than in the walk
 * so it also covers the direct-fetch fast path below - otherwise a source's
 * README.md would still render as a post at its own URL. Any other failure
 * throws - GitHub's response body/headers must never reach the client - which
 * withStaleFallback intercepts to serve the last successfully fetched version
 * of this same post when one exists.
 */
async function fetchPostFile(
  source: ContentSource,
  postPath: string,
): Promise<RawPostFile | null> {
  if (isExcluded(source, `${postPath}.md`)) return null;

  return withStaleFallback(`post:${source.id}:${postPath}`, async () => {
    const res = await fetch(
      contentsUrl(source, `${joinPath(source.postsDir, postPath)}.md`),
      {
        headers: githubHeaders('application/vnd.github.raw+json'),
        next: { tags: ['blog'], revalidate: 300 },
      },
    );

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to fetch blog post "${source.id}:${postPath}"`);
    }

    const raw = await res.text();
    const { data, content } = matter(raw);
    return {
      frontmatter: applySourcePolicy(source, data as PostFrontmatter),
      content,
    };
  });
}

interface ResolvedPost extends RawPostFile {
  source: ContentSource;
  postPath: string;
}

/**
 * Resolves a requested (possibly non-canonical) slug within one source.
 * Fast path: the request already matches a top-level file name verbatim -
 * one fetch, no directory walk. If that fetch fails outright (and has no
 * stale fallback of its own), fall through to the slow path instead of
 * failing the whole request - it may resolve via an already-cached listing.
 * Slow path: recursively list the source once and match by normalized file
 * name, for requests like /blog/MyFirstPost or posts nested in a subfolder.
 */
async function resolveInSource(
  source: ContentSource,
  requestedSlug: string,
): Promise<ResolvedPost | null> {
  try {
    const direct = await fetchPostFile(source, requestedSlug);
    if (direct) {
      return isParentNode(direct.frontmatter)
        ? null
        : { source, postPath: requestedSlug, ...direct };
    }
  } catch (error) {
    console.error(
      `[blog] Direct fetch failed for "${source.id}:${requestedSlug}", falling back to a full listing`,
      error,
    );
  }

  const target = slugify(requestedSlug);
  const postPaths = await listPostPaths(source);
  const postPath = postPaths.find((path) => slugify(lastSegment(path)) === target);
  if (!postPath) return null;

  const file = await fetchPostFile(source, postPath);
  if (!file || isParentNode(file.frontmatter)) return null;
  return { source, postPath, ...file };
}

/**
 * Resolves a slug across every source, in declaration order - so the private
 * blog repo always wins a collision with a public source. A source that fails
 * outright is skipped rather than blocking the ones after it.
 */
async function resolvePost(requestedSlug: string): Promise<ResolvedPost | null> {
  if (!isValidSlugParam(requestedSlug)) return null;

  for (const source of contentSources()) {
    try {
      const resolved = await resolveInSource(source, requestedSlug);
      if (resolved) return resolved;
    } catch (error) {
      console.error(
        `[blog] Source "${source.id}" failed while resolving "${requestedSlug}", trying the next one`,
        error,
      );
    }
  }

  return null;
}

/**
 * Metadata for every post in one source. A single post failing (with no stale
 * fallback available) is skipped rather than failing the whole source.
 */
async function listSourcePosts(source: ContentSource): Promise<PostMeta[]> {
  const postPaths = await listPostPaths(source);

  const results = await Promise.allSettled(
    postPaths.map(async (postPath) => {
      const file = await fetchPostFile(source, postPath);
      return file && !isParentNode(file.frontmatter)
        ? toPostMeta(source, postPath, file.frontmatter)
        : null;
    }),
  );

  return results.flatMap((result) => {
    if (result.status === 'rejected') {
      console.error(
        `[blog] Failed to load a post from "${source.id}" for the index, skipping it`,
        result.reason,
      );
      return [];
    }
    return result.value ? [result.value] : [];
  });
}

/**
 * Metadata for every post across every source, for the blog index. Newest
 * first; undated posts sink to the bottom; ties (and the undated tail) sort
 * alphabetically. Parent-node organizational notes are excluded. Slugs are a
 * flat namespace, so a duplicate across two sources is resolved by source
 * order (blog first) and logged - the same precedence resolvePost applies, so
 * the index can never advertise a post the URL wouldn't reach. A source that
 * fails entirely is skipped rather than emptying the index.
 */
export async function listPosts(): Promise<PostMeta[]> {
  const sources = contentSources();
  const results = await Promise.allSettled(sources.map(listSourcePosts));

  const owners = new Map<string, string>();
  const metas: PostMeta[] = [];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[blog] Source "${sources[index]!.id}" failed to list, omitting it from the index`,
        result.reason,
      );
      return;
    }
    for (const meta of result.value) {
      const owner = owners.get(meta.slug);
      if (owner) {
        console.warn(
          `[blog] Slug "${meta.slug}" exists in both "${owner}" and "${meta.source}" - keeping "${owner}" and hiding the other.`,
        );
        continue;
      }
      owners.set(meta.slug, meta.source);
      metas.push(meta);
    }
  });

  return metas.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : NaN;
    const bTime = b.date ? new Date(b.date).getTime() : NaN;
    const aDated = !Number.isNaN(aTime);
    const bDated = !Number.isNaN(bTime);
    if (aDated !== bDated) return aDated ? -1 : 1;
    if (aDated && bDated && aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Full post for rendering. `meta.slug` is the canonical slug - compare it
 * against the requested URL param and 308-redirect on mismatch. `meta` is
 * always safe to pass to a client component; `source`/`postPath` are not.
 */
export async function getPost(requestedSlug: string): Promise<Post | null> {
  const resolved = await resolvePost(requestedSlug);
  if (!resolved) return null;
  return {
    meta: toPostMeta(resolved.source, resolved.postPath, resolved.frontmatter),
    content: resolved.content,
    source: resolved.source,
    postPath: resolved.postPath,
  };
}

/**
 * Server-only: exposes the raw per-post password for the unlock server
 * action to compare against. Never pass this value to a client component.
 * Untrusted sources have already had `password` stripped by applySourcePolicy,
 * so they always report unlocked.
 */
export async function getPostSecret(requestedSlug: string): Promise<{
  locked: boolean;
  password?: string;
  canonicalSlug: string;
} | null> {
  const resolved = await resolvePost(requestedSlug);
  if (!resolved) return null;
  return {
    locked: isLocked(resolved.frontmatter),
    password:
      typeof resolved.frontmatter.password === 'string'
        ? resolved.frontmatter.password
        : undefined,
    canonicalSlug: slugify(lastSegment(resolved.postPath)),
  };
}

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  txt: 'text/plain',
};

function inferContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Assets are always keyed by the canonical (kebab-case) slug - no
 * PascalCase resolution. Falls back to the last successfully fetched
 * bytes for this exact asset when a fresh fetch fails. Sources with no
 * assetsDir have nothing to serve: their relative links point at GitHub
 * instead, so any request that reaches here for one is a 404.
 */
export async function getAsset(
  source: ContentSource,
  slug: string,
  segments: string[],
): Promise<AssetFile | null> {
  if (!source.assetsDir) return null;
  if (!isValidSlug(slug) || !isValidAssetPath(segments)) return null;

  const assetPath = joinPath(source.assetsDir, slug, ...segments);

  return withStaleFallback(`asset:${source.id}:${slug}/${segments.join('/')}`, async () => {
    const res = await fetch(contentsUrl(source, assetPath), {
      headers: githubHeaders('application/vnd.github.raw+json'),
      next: { tags: ['blog'], revalidate: 300 },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to fetch blog asset "${source.id}:${assetPath}"`);
    }

    const buffer = await res.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      contentType: inferContentType(segments[segments.length - 1]),
    };
  });
}
