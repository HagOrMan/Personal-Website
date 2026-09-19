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
    /**
     * Every `quality` the site is allowed to ask the image optimizer for.
     * Anything outside this list is a 400, so the two entries are load-bearing:
     * 75 is Next's default and what every thumbnail on the site uses, and 92 is
     * ZoomImage's enlarged copy (see LIGHTBOX_QUALITY), which is displayed big
     * enough that a second lossy pass at 75 is visible on it.
     *
     * Declaring it also pins the behaviour: from Next 16 an unlisted quality is
     * rejected by default rather than allowed.
     */
    qualities: [75, 92],
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
