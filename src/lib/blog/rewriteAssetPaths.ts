// Rewrites relative markdown image references so they resolve through the
// blog asset proxy instead of the site root, e.g.:
//   ![cover](cover.png)          -> ![cover](/blog-assets/my-post/cover.png)
//   ![cover](./assets/cover.png) -> ![cover](/blog-assets/my-post/cover.png)
// Absolute URLs, root-relative paths, data URIs, and in-page anchors are
// left untouched.
const MARKDOWN_IMAGE_RE = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

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

function toAssetUrl(url: string, slug: string): string {
  const relative = url.replace(/^\.\//, '').replace(/^assets\//, '');
  return `/blog-assets/${slug}/${relative}`;
}

export function rewriteAssetPaths(markdown: string, slug: string): string {
  return markdown.replace(MARKDOWN_IMAGE_RE, (match, prefix, url, suffix) => {
    if (!isRewritableUrl(url)) return match;
    return `${prefix}${toAssetUrl(url, slug)}${suffix}`;
  });
}
