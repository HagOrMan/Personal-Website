import { listPosts, type PostMeta } from '@/lib/blog/github';

// Summary RSS feed for the blog. This route handler calls the same
// listPosts() as the index page, so it rides on the identical Data Cache
// (300s time-based revalidate + the 'blog' tag busted by the push webhook)
// - no separate prefetch or refresh mechanism is needed. Locked/private
// posts are excluded so the public feed never leaks them, and each item
// carries a title/description/link summary (readers click through to the
// site for the full post).

const FEED_TITLE = "Kyle's Corner — Blog";
const FEED_DESCRIPTION = 'Thoughts, articles, and things I find interesting.';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * The absolute origin the feed's URLs are built from. Prefer an explicit
 * NEXT_PUBLIC_SITE_URL (canonical, stable across deploys); otherwise fall
 * back to the host the request actually arrived on.
 */
function getBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : '';
}

/** RFC-822 date for <pubDate>, or undefined when the post has no valid date. */
function toPubDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? undefined : new Date(time).toUTCString();
}

function renderItem(post: PostMeta, baseUrl: string): string {
  const url = `${baseUrl}/blog/${post.slug}`;
  const pubDate = toPubDate(post.date);
  return [
    '    <item>',
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
    pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
    post.description
      ? `      <description>${escapeXml(post.description)}</description>`
      : null,
    ...(post.tags ?? []).map((tag) => `      <category>${escapeXml(tag)}</category>`),
    '    </item>',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const posts = (await listPosts()).filter((post) => !post.locked);

  const items = posts.map((post) => renderItem(post, baseUrl)).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(`${baseUrl}/blog`)}</link>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${baseUrl}/blog/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // CDN-cacheable for 5 min, matching the underlying content revalidate.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
