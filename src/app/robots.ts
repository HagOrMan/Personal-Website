import type { MetadataRoute } from 'next';

import { absoluteUrl, SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // Preview/branch deployments must never be indexed — an indexable
  // *.vercel.app deployment is a full duplicate of the real domain.
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/login', '/stats'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
