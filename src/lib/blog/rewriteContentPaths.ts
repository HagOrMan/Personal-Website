import { slugify } from '@/lib/blog/slug';

// Rewrites relative markdown references so they resolve correctly when a
// post is served from /blog/[slug]:
//   ![cover](cover.png)             -> ![cover](/blog-assets/my-post/cover.png)
//   ![cover](./assets/cover.png)    -> ![cover](/blog-assets/my-post/cover.png)
//   [next](../SomethingElse.md)     -> [next](/blog/something-else)
//   [notes](Other%20Post.md#intro)  -> [notes](/blog/other-post#intro)
//   [file](../assets/my-post/a.pdf) -> [file](/blog-assets/my-post/a.pdf)
// Absolute URLs, root-relative paths, data URIs, and in-page anchors are
// left untouched.
const MARKDOWN_REF_RE = /(!?)(\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

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

/**
 * A link to another .md file becomes a link to that post. Slugs are always
 * derived from the file name alone, so any `../`/subfolder navigation in
 * the reference is irrelevant - Obsidian-style relative links between
 * posts in different subfolders land on the right URL.
 */
function toPostUrl(mdPath: string, hash: string): string {
  const fileName = mdPath.split('/').pop()!;
  return `/blog/${slugify(fileName.slice(0, -'.md'.length))}${hash}`;
}

export function rewriteContentPaths(markdown: string, slug: string): string {
  return markdown.replace(
    MARKDOWN_REF_RE,
    (match, bang, prefix, url, suffix) => {
      if (!isRewritableUrl(url)) return match;

      const hashIndex = url.indexOf('#');
      const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
      const mdPath = safeDecode(hashIndex === -1 ? url : url.slice(0, hashIndex));

      // Regular (non-image) links to .md files are cross-post links; every
      // other relative reference (images, PDFs, ...) goes through the
      // asset proxy.
      const target =
        !bang && /\.md$/i.test(mdPath)
          ? toPostUrl(mdPath, hash)
          : toAssetUrl(url, slug);
      return `${bang}${prefix}${target}${suffix}`;
    },
  );
}
