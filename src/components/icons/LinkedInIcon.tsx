'use client';
import Image from 'next/image';

import { useResolvedTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

type LinkedInIconProps = {
  className?: string;
  colour?: 'white' | 'black' | 'main'; // main theme is the blue theme that has their standard colour blue
  useThemeForImgSource?: boolean;
};

const LinkedInIcon = ({
  className,
  colour,
  useThemeForImgSource,
}: LinkedInIconProps) => {
  const { resolvedTheme } = useResolvedTheme();

  const imgSource = useThemeForImgSource
    ? resolvedTheme === 'light'
      ? '/png/InBug-Black.png'
      : '/png/InBug-White.png'
    : colour === 'black'
      ? '/png/InBug-Black.png'
      : colour === 'white'
        ? '/png/InBug-White.png'
        : '/png/LI-In-Bug.png';

  const darkModeStyle =
    colour === undefined && !useThemeForImgSource ? 'dark:invert' : '';
  return (
    <Image
      className={cn(darkModeStyle, 'object-contain', className)}
      src={imgSource}
      alt='LinkedIn Icon'
      width={colour === 'main' ? 32 : 24} // Adjust width for main theme (since it's smaller than the others)
      height={colour === 'main' ? 32 : 24} // ^
    />
  );
};

export default LinkedInIcon;
