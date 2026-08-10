import { requiredEnv } from '@/lib/env';

import 'server-only';

// Where blog content is read from.
//
// The private blog repo is the primary source. Additional public repos are
// mounted alongside it so their markdown renders under /blog without the
// content having to move - the repo keeps its own history, stars, README and
// pull-request contributions, and this site just reads it.
//
// Sources are tried in array order when resolving a slug, so the private blog
// repo always wins a collision (see resolvePost/listPosts in github.ts).

export interface ContentSource {
  /** Stable key. Appears in cache keys and PostMeta.source - renaming resets both. */
  id: string;
  /** Human label, used for the "view on GitHub" link on a post. */
  label: string;
  owner: string;
  repo: string;
  /**
   * Only used to build browsable blob URLs - Contents API reads deliberately
   * omit a ref so they follow whatever the repo's default branch is.
   */
  branch: string;
  /** Directory holding the markdown, relative to the repo root. '' = repo root. */
  postsDir: string;
  /**
   * Directory holding per-post assets (keyed by canonical slug), relative to
   * the repo root. Omit for sources that keep no assets - their relative
   * non-markdown links are rewritten to GitHub instead of the asset proxy.
   */
  assetsDir?: string;
  /**
   * Paths (relative to postsDir, including the .md extension for files) that
   * are never posts. Naming a directory skips its whole subtree, which also
   * avoids a pointless Contents API call per revalidate.
   */
  exclude?: string[];
  /**
   * Whether everything in this source was authored solely by the site owner.
   * An untrusted source accepts outside pull requests, so its raw HTML is
   * sanitized and its control frontmatter is ignored - see github.ts
   * (applySourcePolicy) and the post page's rehype pipeline.
   */
  trusted: boolean;
  /**
   * Prepended to a post's folder label, so a source whose markdown sits at the
   * repo root still gets its own group in the index's "By folder" view.
   */
  folderPrefix?: string;
  /** Merged into every post's tags - this is what makes /blog?tag=tutorial work. */
  defaultTags?: string[];
  /** Public repo URL. Set only when the repo is browsable by visitors. */
  publicUrl?: string;
}

/**
 * The public tutorials repo. Owner/repo are hardcoded rather than env-driven
 * because none of it is secret - it's the same information as the link that
 * ships in the rendered page.
 */
const TUTORIALS: ContentSource = {
  id: 'tutorials',
  label: 'Tutorials',
  owner: 'HagOrMan',
  repo: 'Tutorials',
  branch: 'main',
  // The tutorials live at the repo root, so everything that isn't a tutorial
  // has to be named explicitly. helper-files/ and scripts/ hold the .bashrc
  // and shell files the tutorials link to; they contain no markdown, so
  // skipping them here saves a Contents API call each per revalidate.
  postsDir: '',
  exclude: ['README.md', 'Contributions.md', 'helper-files', 'scripts'],
  trusted: false,
  folderPrefix: 'Tutorials',
  defaultTags: ['tutorial'],
  publicUrl: 'https://github.com/HagOrMan/Tutorials',
};

/**
 * Built per call so the blog repo's env vars are still read lazily - a missing
 * var throws at request time (as it always has), not at import/build time.
 * Cheap enough to rebuild: two object literals, no I/O.
 */
export function contentSources(): ContentSource[] {
  return [
    {
      id: 'blog',
      label: 'Blog',
      owner: requiredEnv('BLOG_GITHUB_OWNER'),
      repo: requiredEnv('BLOG_GITHUB_REPO'),
      branch: 'main',
      postsDir: 'posts',
      assetsDir: 'assets',
      trusted: true,
    },
    TUTORIALS,
  ];
}

/** Joins path parts, dropping empties so a root-level ('') dir collapses away. */
export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

/**
 * True when `relPath` (relative to postsDir) is explicitly not a post.
 * Matched case-insensitively: the Contents API is case-sensitive, so a
 * mismatched-case request 404s on its own today, but an exclusion is a safety
 * list and should not quietly depend on that.
 */
export function isExcluded(source: ContentSource, relPath: string): boolean {
  const target = relPath.toLowerCase();
  return source.exclude?.some((path) => path.toLowerCase() === target) ?? false;
}

/**
 * Browsable GitHub URL for a file at `repoPath` (relative to the repo root),
 * or undefined when the source is private and has nothing to link to.
 */
export function blobUrl(
  source: ContentSource,
  repoPath: string,
): string | undefined {
  return source.publicUrl
    ? `${source.publicUrl}/blob/${source.branch}/${repoPath}`
    : undefined;
}
