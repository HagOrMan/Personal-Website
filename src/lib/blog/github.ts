import 'server-only';

import matter from 'gray-matter';

import { formatTitle, slugify } from '@/lib/blog/slug';

// Content lives in a private GitHub repo:
//   posts/[fileName].md      - markdown files, optionally nested in
//                              subfolders (e.g. posts/EventReflections/*.md)
//                              for authoring convenience only - the
//                              subfolder never appears in the slug/URL.
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

/** The slug/title are always derived from the file name alone, never the subfolder. */
function lastSegment(postPath: string): string {
  return postPath.split('/').pop()!;
}

function toPostMeta(postPath: string, fm: PostFrontmatter): PostMeta {
  const fileName = lastSegment(postPath);
  return {
    slug: slugify(fileName),
    title: fm.title ?? formatTitle(fileName),
    date: fm.date,
    description: fm.description,
    tags: fm.tags,
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

async function listDirEntries(path: string): Promise<DirEntry[]> {
  const res = await fetch(contentsUrl(path), {
    headers: githubHeaders('application/vnd.github+json'),
    next: { tags: ['blog'], revalidate: 300 },
  });
  if (!res.ok) return [];
  return (await res.json()) as DirEntry[];
}

/**
 * Recursively walks posts/ (and any subfolders) for markdown files. One
 * Contents API call per directory - cheap for a personal blog's post count,
 * and cached the same as everything else via the 'blog' tag.
 */
async function walkPostsDir(dirPath: string): Promise<string[]> {
  const entries = await listDirEntries(dirPath);

  const nested = await Promise.all(
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

  return nested.flat();
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
 * Any other failure throws a generic error - GitHub's response body/headers
 * must never reach the client.
 */
async function fetchPostFile(postPath: string): Promise<RawPostFile | null> {
  const res = await fetch(contentsUrl(`posts/${postPath}.md`), {
    headers: githubHeaders('application/vnd.github.raw+json'),
    next: { tags: ['blog'], revalidate: 300 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch blog post content');

  const raw = await res.text();
  const { data, content } = matter(raw);
  return { frontmatter: data as PostFrontmatter, content };
}

interface ResolvedPost extends RawPostFile {
  postPath: string;
}

/**
 * Resolves a requested (possibly non-canonical) slug to its post file.
 * Fast path: the request already matches a top-level file name verbatim -
 * one fetch, no directory walk. Slow path: recursively list posts/ once
 * and match by normalized file name (the old resolveFileName pattern),
 * for requests like /blog/MyFirstPost or posts nested in a subfolder.
 */
async function resolvePost(requestedSlug: string): Promise<ResolvedPost | null> {
  if (!isValidSlugParam(requestedSlug)) return null;

  const direct = await fetchPostFile(requestedSlug);
  if (direct) return { postPath: requestedSlug, ...direct };

  const target = slugify(requestedSlug);
  const postPaths = await listPostPaths();
  const postPath = postPaths.find((path) => slugify(lastSegment(path)) === target);
  if (!postPath) return null;

  const file = await fetchPostFile(postPath);
  return file ? { postPath, ...file } : null;
}

/** Metadata for every post, for the blog index. Newest first when dated. */
export async function listPosts(): Promise<PostMeta[]> {
  const postPaths = await listPostPaths();

  const metas = await Promise.all(
    postPaths.map(async (postPath) => {
      const file = await fetchPostFile(postPath);
      return file ? toPostMeta(postPath, file.frontmatter) : null;
    }),
  );

  return metas
    .filter((meta): meta is PostMeta => meta !== null)
    .sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
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

/** Assets are always keyed by the canonical (kebab-case) slug - no PascalCase resolution. */
export async function getAsset(
  slug: string,
  segments: string[],
): Promise<AssetFile | null> {
  if (!isValidSlug(slug) || !isValidAssetPath(segments)) return null;

  const res = await fetch(contentsUrl(`assets/${slug}/${segments.join('/')}`), {
    headers: githubHeaders('application/vnd.github.raw+json'),
    next: { tags: ['blog'], revalidate: 300 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch blog asset');

  const buffer = await res.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    contentType: inferContentType(segments[segments.length - 1]),
  };
}
