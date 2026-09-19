import type { SVGProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The GitHub mark as an inline path, painted in `currentColor`.
 *
 * Not lucide's `Github`, which is deprecated — lucide dropped brand icons, so
 * that import is on borrowed time and would break on an upgrade. This is the
 * official mark instead, the same shape as public/svg/github-mark.svg, which
 * is also more faithful than the outline lucide drew.
 *
 * Not GithubIcon either, which renders that file through next/image and picks
 * a light or dark copy from the resolved theme. That's right where the mark is
 * a standalone brand credit at a fixed colour — the footer, the home page —
 * but wrong inside a link, where the mark has to inherit the link's colour and
 * follow it through hover and focus. A raster can't do that; one path and
 * `currentColor` can, and it costs no image request.
 *
 * Sized by the caller through `className` — there's no intrinsic size here, so
 * a bare instance would collapse.
 */
export function GitHubGlyph({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      // GitHub publishes the mark at 98×96, not on a square grid, and the path
      // below is copied byte for byte — squashing it into 0 0 24 24 would
      // distort it. The viewBox does the scaling instead.
      viewBox='0 0 98 96'
      fill='currentColor'
      // Decorative by default: it always sits inside a link that carries its
      // own aria-label. Spread last so a caller can say otherwise.
      aria-hidden
      // Without this IE/Edge legacy and some AT still put SVGs in the tab
      // order; harmless everywhere else.
      focusable='false'
      className={cn('shrink-0', className)}
      {...props}
    >
      <path
        // Both rules come straight from github-mark.svg. The path is a single
        // closed subpath, so they change nothing here — they're kept so this
        // and the .svg file still diff cleanly against each other.
        fillRule='evenodd'
        clipRule='evenodd'
        d='M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z'
      />
    </svg>
  );
}
