import type { MetadataRoute } from 'next';

import { projects } from '@/constant/projects';
import { listPosts } from '@/lib/blog/github';
import { projectDetailHref } from '@/lib/projects/paths';
import { absoluteUrl } from '@/lib/seo';

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1.0, changeFrequency: 'monthly' },
  { path: '/about-me', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/projects', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/experience', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/resume', priority: 0.6, changeFrequency: 'yearly' },
  // Project detail pages come from constant/projects.ts — see PROJECT_ROUTES.
  { path: '/ocean', priority: 0.3, changeFrequency: 'yearly' },
];

/**
 * Derived, so adding a project can't leave the sitemap behind.
 *
 * Only projects that actually have a write-up are listed: a route whose page
 * says "still working on this" is thin content, and submitting eleven of them
 * asks Google to judge the site on its emptiest pages. They're unlinked and
 * unlisted until there's something on them — see `hasDetailPage`.
 */
const PROJECT_ROUTES = projects.flatMap((project) => {
  const path = projectDetailHref(project);
  if (!path) return [];

  return [
    {
      path,
      priority: project.featured ? 0.6 : 0.5,
      changeFrequency: 'yearly' as const,
    },
  ];
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = [...STATIC_ROUTES, ...PROJECT_ROUTES].map(
    ({ path, ...rest }) => ({
      url: absoluteUrl(path),
      lastModified: new Date(),
      ...rest,
    }),
  );

  try {
    const posts = await listPosts();
    const postEntries = posts
      // Locked posts are noindex — never list them.
      .filter((post) => !post.locked)
      .map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.date ? new Date(post.date) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
    return [...staticEntries, ...postEntries];
  } catch (err) {
    // The sitemap should not 500 the whole route if GitHub is unreachable
    // at build time — fall back to the static routes only.
    console.error('[sitemap] Failed to load posts', err);
    return staticEntries;
  }
}
