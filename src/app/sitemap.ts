import type { MetadataRoute } from 'next';

import { listPosts } from '@/lib/blog/github';
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
  {
    path: '/projects/hatch-booking-system',
    priority: 0.6,
    changeFrequency: 'yearly',
  },
  { path: '/projects/island-builder', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/projects/medisafe', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/projects/monpoke', priority: 0.5, changeFrequency: 'yearly' },
  {
    path: '/projects/piraten-kapern',
    priority: 0.5,
    changeFrequency: 'yearly',
  },
  { path: '/projects/infinity-chess', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/ocean', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_ROUTES.map(({ path, ...rest }) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    ...rest,
  }));

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
