import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description:
      'Kyle Hagerman is a software developer who builds robust, maintainable systems that never surprise you. Portfolio, projects, and writing.',
    start_url: '/',
    display: 'standalone',
    background_color: '#061113',
    theme_color: '#061113',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
