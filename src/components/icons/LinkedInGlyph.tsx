import { cn } from '@/lib/utils';

/**
 * The LinkedIn bug as an inline path, painted in `currentColor`.
 *
 * Deliberately not LinkedInIcon, which renders the official PNG through
 * next/image and picks its file from the resolved theme. That's right where
 * the mark is a standalone brand credit at a fixed colour - the footer, the
 * references section - but wrong inside a link, where the mark is part of the
 * label and has to inherit the link's colour and change with it on hover and
 * focus. A raster bug can't do that; one path and `currentColor` can, and it
 * costs no image request.
 *
 * Sized by the caller through `className` - there's no intrinsic size here, so
 * a bare instance would collapse.
 */
export function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      // Decorative in every use so far: it always sits beside a text label, or
      // inside a link that carries its own aria-label.
      aria-hidden
      // Without this IE/Edge legacy and some AT still put SVGs in the tab
      // order; harmless everywhere else.
      focusable='false'
      className={cn('shrink-0', className)}
    >
      {/* One path: the tile, with the "in" and its dot knocked out of it by
          winding rather than drawn as separate shapes. That's what lets the
          whole mark take a single fill. */}
      <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
    </svg>
  );
}
