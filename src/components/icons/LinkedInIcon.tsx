import Image from 'next/image';

import { cn } from '@/lib/utils';

type LinkedInIconProps = {
  className?: string;
  /** 'main' is LinkedIn's own blue bug, which is larger than the mono ones. */
  colour?: 'white' | 'black' | 'main';
  /** See the note in GithubIcon - answered in CSS now, not in JS. */
  useThemeForImgSource?: boolean;
};

/**
 * The LinkedIn bug. The theme-driven variant is chosen by CSS off the `.dark`
 * class on <html> rather than by `useResolvedTheme()` - see the note in
 * GithubIcon, which this mirrors so the two stay in step where they sit side
 * by side in the hero and the footer.
 */
const LinkedInIcon = ({
  className,
  colour,
  useThemeForImgSource,
}: LinkedInIconProps) => {
  // 'main' is the blue bug, published at a smaller mark size than the mono
  // ones, so it needs a larger box to end up optically equal.
  const size = colour === 'main' ? 32 : 24;
  const shared = cn('object-contain', className);

  if (useThemeForImgSource) {
    return (
      <>
        <Image
          src='/png/InBug-Black.png'
          alt='LinkedIn Icon'
          width={24}
          height={24}
          className={cn(shared, 'dark:hidden')}
        />
        <Image
          src='/png/InBug-White.png'
          alt='LinkedIn Icon'
          width={24}
          height={24}
          className={cn(shared, 'hidden dark:block')}
        />
      </>
    );
  }

  const src =
    colour === 'black'
      ? '/png/InBug-Black.png'
      : colour === 'white'
        ? '/png/InBug-White.png'
        : '/png/LI-In-Bug.png';

  return (
    <Image
      src={src}
      alt='LinkedIn Icon'
      width={size}
      height={size}
      // Only the untinted default inverts, and it is the pre-existing
      // behaviour: an explicit `colour` is a deliberate fixed choice.
      className={cn(shared, colour === undefined && 'dark:invert')}
    />
  );
};

export default LinkedInIcon;
