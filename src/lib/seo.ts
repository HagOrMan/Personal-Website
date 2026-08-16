import type { Metadata } from 'next';

/**
 * Canonical origin for every absolute URL the site emits — og:url, canonicals,
 * the sitemap, the RSS feed, and JSON-LD @ids.
 *
 * NEXT_PUBLIC_SITE_URL wins so a self-hosted or staging deploy can point
 * elsewhere. The fallback is the real production domain and deliberately NOT
 * VERCEL_URL: letting Next fall back to the deployment host is what put
 * *.vercel.app into shared links in the first place. Preview deploys are kept
 * out of the index by robots.ts instead (see src/app/robots.ts).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kylehagerman.dev'
).replace(/\/+$/, '');

export const SITE = {
  url: SITE_URL,
  /** og:site_name — the brand. */
  name: "Kyle's Corner",
  /** The person behind it — what search results should surface. */
  author: 'Kyle Hagerman',
  jobTitle: 'Software Developer',
  locale: 'en_CA',
  twitterCard: 'summary_large_image' as const,
} as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Standard metadata for a normal, indexable page.
 *
 * Deliberately does NOT set openGraph.images: the file-convention
 * opengraph-image.tsx in each route segment injects og:image and
 * twitter:image automatically, with a hashed URL that busts caches when the
 * card design changes.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: {
      card: SITE.twitterCard,
      title,
      description,
    },
  };
}
