import { slugify } from '@/lib/blog/slug';
import {
  blobUrl,
  type ContentSource,
  isExcluded,
  joinPath,
} from '@/lib/blog/sources';

// Rewrites relative markdown references so they resolve correctly when a
// post is served from /blog/[slug]:
//   ![cover](cover.png)             -> ![cover](/blog-assets/my-post/cover.png)
//   ![cover](./assets/cover.png)    -> ![cover](/blog-assets/my-post/cover.png)
//   [next](../SomethingElse.md)     -> [next](/blog/something-else)
//   [notes](Other%20Post.md#intro)  -> [notes](/blog/other-post#intro)
//   [sibling](AnotherPost)          -> [sibling](/blog/another-post)
//   [file](../assets/my-post/a.pdf) -> [file](/blog-assets/my-post/a.pdf)
// Absolute URLs, root-relative paths, data URIs, and in-page anchors are
// left untouched.
//
// Sources that keep no assets directory (the public tutorials repo) get a
// different treatment for non-markdown references: rather than proxying them
// through /blog-assets, they're pointed at the file on GitHub. Those files
// are shell/bashrc snippets meant to be read and copied from the repo, and
// the proxy would serve them as application/octet-stream (a download) since
// they have no image/document MIME type.
const MARKDOWN_REF_RE = /(!?)(\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

export interface ContentContext {
  /** Canonical slug of the post being rendered - keys its assets. */
  slug: string;
  /** The post's path within its source's postsDir, without the .md extension. */
  postPath: string;
  source: ContentSource;
}

function isRewritableUrl(url: string): boolean {
  if (
    !url ||
    url.startsWith('/') ||
    url.startsWith('#') ||
    url.startsWith('data:')
  ) {
    return false;
  }
  // Anything with a URI scheme (http:, https:, mailto:, etc.) is absolute.
  return !/^[a-z][a-z0-9+.-]*:/i.test(url);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Whether a file name carries an extension. The dot may sit at position 0, so
 * dotfiles (`.bashrc` and friends, real files in the tutorials repo) count as
 * extensioned and are never mistaken for posts.
 */
function hasFileExtension(fileName: string): boolean {
  return /\.[^./]+$/.test(fileName);
}

/**
 * Whether a non-image relative reference points at another post.
 *
 * Two forms count. An explicit `.md` is the canonical one. An extensionless
 * reference does too: every asset the proxy serves - image, PDF, snippet -
 * has an extension, so a bare `[text](AnotherPost)` can only be a sibling
 * post whose suffix wasn't typed. Without this, those fell through to the
 * asset branch and resolved to /blog-assets/<slug>/AnotherPost.
 */
function isPostReference(decodedPath: string): boolean {
  const fileName = decodedPath.split('/').pop() ?? '';
  return /\.md$/i.test(fileName) || !hasFileExtension(fileName);
}

function toAssetUrl(url: string, slug: string): string {
  // assets/ is a sibling of posts/, not colocated with the markdown file,
  // so a correct relative reference needs at least one `../` to leave
  // posts/ (more if the post itself is nested, e.g. posts/Foo/bar.md needs
  // ../../assets/bar/cover.png). Strip that navigation, an optional
  // leading assets/, and a redundant slug segment, then re-root under the
  // asset proxy.
  let relative = url.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  relative = relative.replace(/^assets\//, '');
  if (relative.startsWith(`${slug}/`)) {
    relative = relative.slice(slug.length + 1);
  }
  return `/blog-assets/${slug}/${relative}`;
}

// Any host works - only the resolved pathname is kept. `.invalid` is reserved
// by RFC 2606 so this can never accidentally address something real.
const RESOLVE_ORIGIN = 'https://resolve.invalid';

/**
 * Resolves a relative reference against the directory the post itself lives
 * in, normalizing `./` and `../`, and returns a repo-root-relative path.
 * URL does the normalization (and clamps `../` that would escape the root).
 */
function resolveRepoPath(url: string, baseDir: string): string {
  try {
    const { pathname } = new URL(
      url,
      `${RESOLVE_ORIGIN}/${baseDir ? `${baseDir}/` : ''}`,
    );
    return decodeURIComponent(pathname.replace(/^\//, ''));
  } catch {
    return url;
  }
}

/**
 * A repo-root-relative path expressed relative to the source's postsDir, or
 * null when it falls outside postsDir entirely (so it can't be a post).
 */
function relativeToPostsDir(
  source: ContentSource,
  repoPath: string,
): string | null {
  if (!source.postsDir) return repoPath;
  const prefix = `${source.postsDir}/`;
  return repoPath.startsWith(prefix) ? repoPath.slice(prefix.length) : null;
}

/**
 * A link to another .md file becomes a link to that post. Slugs are always
 * derived from the file name alone, so any `../`/subfolder navigation in
 * the reference is irrelevant - Obsidian-style relative links between
 * posts in different subfolders land on the right URL.
 *
 * The exception is a link to a markdown file the source deliberately doesn't
 * publish (a README, a contributions doc): that has no post to point at, so
 * it goes to the file on GitHub instead of a guaranteed 404.
 */
function toPostUrl(
  ctx: ContentContext,
  rawPath: string,
  baseDir: string,
  hash: string,
): string {
  const repoPath = resolveRepoPath(rawPath, baseDir);
  // Exclusion patterns are written against the .md files that exist in the
  // repo, so an extensionless reference has to be checked in that form.
  const mdRepoPath = /\.md$/i.test(repoPath) ? repoPath : `${repoPath}.md`;
  const relPath = relativeToPostsDir(ctx.source, mdRepoPath);
  if (relPath !== null && isExcluded(ctx.source, relPath)) {
    const external = blobUrl(ctx.source, mdRepoPath);
    if (external) return `${external}${hash}`;
  }

  // Only strip the suffix when it's actually there - slicing a fixed three
  // characters off an extensionless name would eat real ones.
  const fileName = safeDecode(rawPath).split('/').pop()!;
  return `/blog/${slugify(fileName.replace(/\.md$/i, ''))}${hash}`;
}

/** Every non-markdown reference: an image, a PDF, a shell snippet. */
function toFileUrl(
  ctx: ContentContext,
  rawPath: string,
  baseDir: string,
  hash: string,
): string {
  if (ctx.source.assetsDir) return `${toAssetUrl(rawPath, ctx.slug)}${hash}`;

  const external = blobUrl(ctx.source, resolveRepoPath(rawPath, baseDir));
  return `${external ?? rawPath}${hash}`;
}

export function rewriteContentPaths(
  markdown: string,
  ctx: ContentContext,
): string {
  // The post's own directory inside the repo, which every relative reference
  // in its body resolves against.
  const baseDir = joinPath(
    ctx.source.postsDir,
    ctx.postPath.split('/').slice(0, -1).join('/'),
  );

  return markdown.replace(
    MARKDOWN_REF_RE,
    (match, bang: string, prefix: string, url: string, suffix: string) => {
      if (!isRewritableUrl(url)) return match;

      const hashIndex = url.indexOf('#');
      const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
      const rawPath = hashIndex === -1 ? url : url.slice(0, hashIndex);

      // Regular (non-image) links to markdown files are cross-post links;
      // every other relative reference (images, PDFs, shell snippets, ...)
      // is a file.
      const isPostLink = !bang && isPostReference(safeDecode(rawPath));
      const target = isPostLink
        ? toPostUrl(ctx, rawPath, baseDir, hash)
        : toFileUrl(ctx, rawPath, baseDir, hash);

      return `${bang}${prefix}${target}${suffix}`;
    },
  );
}
