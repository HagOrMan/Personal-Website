import 'server-only';

import matter from 'gray-matter';

import { formatTitle, slugify } from '@/lib/blog/slug';

// Content lives in a private GitHub repo:
//   posts/[fileName].md      - one markdown file per post
//   assets/[slug]/...        - per-post assets, keyed by the canonical slug
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
// What we accept off the URL before normalizing (still blocks traversal -
// '.' isn't in the allowed set, so '..' can never match).
const SLUG_PARAM_RE = /^[A-Za-z0-9_-]+$/;
const ASSET_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

function isValidSlugParam(slug: string): boolean {
  return SLUG_PARAM_RE.test(slug);
}

export function isValidAssetPath(segments: string[]): boolean {
  return (
    segments.length > 0 &&
    segments.every(
      (segment) => segment !== '..' && ASSET_SEGMENT_RE.test(segment),
    )
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

function toPostMeta(fileName: string, fm: PostFrontmatter): PostMeta {
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

async function listPostFileNames(): Promise<string[]> {
  const res = await fetch(contentsUrl('posts'), {
    headers: githubHeaders('application/vnd.github+json'),
    next: { tags: ['blog'], revalidate: 300 },
  });

  if (!res.ok) return [];

  const entries = (await res.json()) as DirEntry[];
  return entries
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
    .map((entry) => entry.name.slice(0, -3))
    .filter(isValidSlugParam);
}

/**
 * Fetches and parses a single post file by its exact repo file name (not
 * yet slug-normalized). Returns null on a 404 so callers can decide how to
 * surface "not found" for their context. Any other failure throws a
 * generic error - GitHub's response body/headers must never reach the client.
 */
async function fetchPostFileByName(
  fileName: string,
): Promise<RawPostFile | null> {
  const res = await fetch(contentsUrl(`posts/${fileName}.md`), {
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
  fileName: string;
}

/**
 * Resolves a requested (possibly non-canonical) slug to its post file.
 * Fast path: the request already matches a file name verbatim - one fetch,
 * no directory listing. Slow path: list posts/ once and match by
 * normalized slug (the old resolveFileName pattern), for requests like
 * /blog/MyFirstPost.
 */
async function resolvePost(
  requestedSlug: string,
): Promise<ResolvedPost | null> {
  if (!isValidSlugParam(requestedSlug)) return null;

  const direct = await fetchPostFileByName(requestedSlug);
  if (direct) return { fileName: requestedSlug, ...direct };

  const target = slugify(requestedSlug);
  const fileNames = await listPostFileNames();
  const fileName = fileNames.find((name) => slugify(name) === target);
  if (!fileName) return null;

  const file = await fetchPostFileByName(fileName);
  return file ? { fileName, ...file } : null;
}

/** Metadata for every post, for the blog index. Newest first when dated. */
export async function listPosts(): Promise<PostMeta[]> {
  const fileNames = await listPostFileNames();

  const metas = await Promise.all(
    fileNames.map(async (fileName) => {
      const file = await fetchPostFileByName(fileName);
      return file ? toPostMeta(fileName, file.frontmatter) : null;
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
    meta: toPostMeta(resolved.fileName, resolved.frontmatter),
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
    canonicalSlug: slugify(resolved.fileName),
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
