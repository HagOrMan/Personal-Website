import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Next's defaults leave a gap between 384 and 640, and the about-me
    // poster lands in it: `sizes='224px'` at DPR 1.75 needs 392 device px, so
    // the browser skips 384 by 8 pixels and takes 640 - 1.66x the width, 2.7x
    // the pixels. The download is the smaller half of the cost; the decode
    // (726K pixels vs 264K) happens on the main thread in the same window the
    // LCP frame is waiting on. 448 gives that request somewhere to land.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 448],
  },
  async headers() {
    // robots.txt asks nicely; this header is enforced. Keeps preview/branch
    // deployments out of the index even if a crawler skips robots.txt.
    if (process.env.VERCEL_ENV === 'production') return [];
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
