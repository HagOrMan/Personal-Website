import Image from 'next/image';

import { cn } from '@/lib/utils';

type GitHubIconProps = {
  className?: string;
  colour?: 'white' | 'black';
  /**
   * Pick the mark from the active theme - the white one in dark mode, the
   * black one in light mode - rather than inverting a single file.
   *
   * Answered in CSS, so this stays a server component.
   */
  useThemeForImgSource?: boolean;
};

/**
 * The GitHub mark as an image, for the places it is a standalone brand credit
 * at a fixed colour - the footer, the hero, a blog post's source link. Inside
 * a link whose colour moves on hover, use GitHubGlyph instead: that one is a
 * path in `currentColor` and can follow the link through its states, which a
 * raster never can.
 *
 * ── Theme in CSS, not in JS ───────────────────────────────────────────────
 *
 * Don't switch this to `useResolvedTheme()`. That hook reports 'light' on the
 * server and on the first client render - it exposes `isThemeReady` for
 * exactly this reason - so choosing a file from it paints the black mark on a
 * near-black page until it settles. `.dark` is already a class on <html>, so
 * rendering both marks and letting CSS hide one is correct on the server,
 * before hydration, and if hydration never happens.
 *
 * The cost is that both files are fetched even though one is `display: none`.
 * They are ~1KB and shared across the site.
 *
 * Both copies carry the same alt rather than one being aria-hidden:
 * `display: none` removes an element from the accessibility tree, so exactly
 * one is ever exposed, and hiding the dark copy would leave the footer's
 * icon-only GitHub link with no accessible name in dark mode.
 */
const GitHubIcon = ({
  className,
  colour,
  useThemeForImgSource,
}: GitHubIconProps) => {
  // The caller's sizing goes on the <img> itself, not on a wrapper - a
  // wrapper leaves the image at its intrinsic 24px and it overflows any
  // smaller box.
  const shared = cn('object-contain', className);

  if (useThemeForImgSource) {
    return (
      <>
        <Image
          src='/svg/github-mark.svg'
          alt='GitHub Icon'
          width={24}
          height={24}
          className={cn(shared, 'dark:hidden')}
        />
        <Image
          src='/svg/github-mark-white.svg'
          alt='GitHub Icon'
          width={24}
          height={24}
          className={cn(shared, 'hidden dark:block')}
        />
      </>
    );
  }

  // An explicit `colour` is a deliberate fixed choice, so it is never
  // inverted. With neither prop, the black mark inverts in dark mode - exact
  // for a mark this close to pure black, and one request instead of two.
  return (
    <Image
      src={colour === 'white' ? '/svg/github-mark-white.svg' : '/svg/github-mark.svg'}
      alt='GitHub Icon'
      width={24}
      height={24}
      className={cn(shared, colour === undefined && 'dark:invert')}
    />
  );
};

export default GitHubIcon;
