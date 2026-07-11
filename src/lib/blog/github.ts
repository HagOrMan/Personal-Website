import matter from 'gray-matter';

import { formatTitle, slugify } from '@/lib/blog/slug';
import { withStaleFallback } from '@/lib/blog/staleCache';

import 'server-only';

// Content lives in a private GitHub repo:
//   posts/[fileName].md      - markdown files, optionally nested in
//                              subfolders (e.g. posts/EventReflections/*.md).
//                              The subfolder never appears in the slug/URL,
//                              but it does surface as PostMeta.folder so the
//                              index can group posts by it.
//   assets/[slug]/...        - per-post assets, a sibling of posts/, keyed
//                              by the canonical slug (not the subfolder path)
//
// Post file names can be kebab-case ("my-first-post.md") or PascalCase
// ("MyFirstPost.md") - either resolves to the same canonical kebab-case
// slug (see lib/blog/slug.ts), so bookmarked/typed URLs in any case still
// land on the right post. The page layer 308-redirects non-canonical
// requests to the canonical slug.
//
// All reads go through the GitHub Contents API using a read-only fine-grained
// PAT. Nothing here ever runs on the client - this module must only be
// imported from Server Components, Route Handlers, or Server Actions.

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
}

export interface Post {
  meta: PostMeta;
  content: string;
}

export interface AssetFile {
  bytes: Uint8Array;
  contentType: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function contentsUrl(path: string): string {
  const owner = requiredEnv('BLOG_GITHUB_OWNER');
  const repo = requiredEnv('BLOG_GITHUB_REPO');
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`;
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

function toPostMeta(postPath: string, fm: PostFrontmatter): PostMeta {
  const segments = postPath.split('/');
  const fileName = segments.pop()!;
  const folder =
    segments.length > 0
      ? segments.map(formatFolderLabel).join(' / ')
      : undefined;
  return {
    slug: slugify(fileName),
    title: fm.title ?? formatTitle(fileName),
    date: fm.date,
    description: fm.description,
    tags: normalizeTags(fm.tags),
    folder,
    locked: isLocked(fm),
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
async function listDirEntries(path: string): Promise<DirEntry[]> {
  return withStaleFallback(`dir:${path}`, async () => {
    const res = await fetch(contentsUrl(path), {
      headers: githubHeaders('application/vnd.github+json'),
      next: { tags: ['blog'], revalidate: 300 },
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Failed to list "${path}"`);
    return (await res.json()) as DirEntry[];
  });
}

/**
 * Recursively walks posts/ (and any subfolders) for markdown files. One
 * Contents API call per directory - cheap for a personal blog's post count,
 * and cached the same as everything else via the 'blog' tag. A failure in
 * one subfolder (after exhausting its own stale fallback) doesn't take
 * down discovery of every other post - it's just skipped and logged.
 */
async function walkPostsDir(dirPath: string): Promise<string[]> {
  const entries = await listDirEntries(dirPath);

  const results = await Promise.allSettled(
    entries.map(async (entry): Promise<string[]> => {
      if (entry.type === 'file' && entry.name.endsWith('.md')) {
        return [`${dirPath}/${entry.name}`];
      }
      if (entry.type === 'dir') {
        return walkPostsDir(`${dirPath}/${entry.name}`);
      }
      return [];
    }),
  );

  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value;
    console.error(`[blog] Failed to walk "${dirPath}", skipping`, result.reason);
    return [];
  });
}

/**
 * Every post's path relative to posts/, without the .md extension - e.g.
 * "my-first-post" or "EventReflections/my-trip".
 */
async function listPostPaths(): Promise<string[]> {
  const fullPaths = await walkPostsDir('posts');
  return fullPaths
    .map((path) => path.slice('posts/'.length, -'.md'.length))
    .filter(isValidPostPath);
}

/**
 * Fetches and parses a single post file by its path relative to posts/
 * (not yet slug-normalized, may include a subfolder). Returns null on a
 * 404 so callers can decide how to surface "not found" for their context.
 * Any other failure throws - GitHub's response body/headers must never
 * reach the client - which withStaleFallback intercepts to serve the last
 * successfully fetched version of this same post when one exists.
 */
async function fetchPostFile(postPath: string): Promise<RawPostFile | null> {
  return withStaleFallback(`post:${postPath}`, async () => {
    const res = await fetch(contentsUrl(`posts/${postPath}.md`), {
      headers: githubHeaders('application/vnd.github.raw+json'),
      next: { tags: ['blog'], revalidate: 300 },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch blog post "${postPath}"`);

    const raw = await res.text();
    const { data, content } = matter(raw);
    return { frontmatter: data as PostFrontmatter, content };
  });
}

interface ResolvedPost extends RawPostFile {
  postPath: string;
}

/**
 * Resolves a requested (possibly non-canonical) slug to its post file.
 * Fast path: the request already matches a top-level file name verbatim -
 * one fetch, no directory walk. If that fetch fails outright (and has no
 * stale fallback of its own), fall through to the slow path instead of
 * failing the whole request - it may resolve via an already-cached listing.
 * Slow path: recursively list posts/ once and match by normalized file
 * name (the old resolveFileName pattern), for requests like
 * /blog/MyFirstPost or posts nested in a subfolder.
 */
async function resolvePost(requestedSlug: string): Promise<ResolvedPost | null> {
  if (!isValidSlugParam(requestedSlug)) return null;

  try {
    const direct = await fetchPostFile(requestedSlug);
    if (direct) {
      return isParentNode(direct.frontmatter)
        ? null
        : { postPath: requestedSlug, ...direct };
    }
  } catch (error) {
    console.error(
      `[blog] Direct fetch failed for "${requestedSlug}", falling back to a full listing`,
      error,
    );
  }

  const target = slugify(requestedSlug);
  const postPaths = await listPostPaths();
  const postPath = postPaths.find((path) => slugify(lastSegment(path)) === target);
  if (!postPath) return null;

  const file = await fetchPostFile(postPath);
  if (!file || isParentNode(file.frontmatter)) return null;
  return { postPath, ...file };
}

/**
 * Metadata for every post, for the blog index. Newest first; undated posts
 * sink to the bottom; ties (and the undated tail) sort alphabetically.
 * Parent-node organizational notes are excluded. A single post failing
 * (with no stale fallback available) is skipped rather than failing the
 * entire index for every visitor.
 */
export async function listPosts(): Promise<PostMeta[]> {
  const postPaths = await listPostPaths();

  const results = await Promise.allSettled(
    postPaths.map(async (postPath) => {
      const file = await fetchPostFile(postPath);
      return file && !isParentNode(file.frontmatter)
        ? toPostMeta(postPath, file.frontmatter)
        : null;
    }),
  );

  const metas = results.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    console.error('[blog] Failed to load a post for the index, skipping it', result.reason);
    return null;
  });

  return metas
    .filter((meta): meta is PostMeta => meta !== null)
    .sort((a, b) => {
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
 * always safe to pass to a client component.
 */
export async function getPost(requestedSlug: string): Promise<Post | null> {
  const resolved = await resolvePost(requestedSlug);
  if (!resolved) return null;
  return {
    meta: toPostMeta(resolved.postPath, resolved.frontmatter),
    content: resolved.content,
  };
}

/**
 * Server-only: exposes the raw per-post password for the unlock server
 * action to compare against. Never pass this value to a client component.
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
 * bytes for this exact asset when a fresh fetch fails.
 */
export async function getAsset(
  slug: string,
  segments: string[],
): Promise<AssetFile | null> {
  if (!isValidSlug(slug) || !isValidAssetPath(segments)) return null;

  return withStaleFallback(`asset:${slug}/${segments.join('/')}`, async () => {
    const res = await fetch(contentsUrl(`assets/${slug}/${segments.join('/')}`), {
      headers: githubHeaders('application/vnd.github.raw+json'),
      next: { tags: ['blog'], revalidate: 300 },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch blog asset "${slug}/${segments.join('/')}"`);

    const buffer = await res.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      contentType: inferContentType(segments[segments.length - 1]),
    };
  });
}
