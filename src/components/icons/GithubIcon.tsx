'use client';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/context/ThemeContext';

type GitHubIconProps = {
  className?: string;
  colour?: 'white' | 'black';
  useThemeForImgSource?: boolean;
};

const GitHubIcon = ({
  className,
  colour,
  useThemeForImgSource,
}: GitHubIconProps) => {
  /**
   * Rationale behind colour and useThemeForImgSource props:
   * - I want the ability to change the image used if desired
   * - I do not want to tie the image used to a theme, however, I want the option to base the image off of the theme
   * - thus, the *default* will be the regular black github svg, where on dark mode it inverts to make it white
   *   - because the inversion doesn't look as white as the white image, this is why I give the option to change the image based on the theme, since in dark theme it'll look whiter
   * - however, if a colour prop is passed in without useThemeForImgSource, this behaviour disappears and we just use the passed in image with no dark mode changes
   */
  const { resolvedTheme } = useResolvedTheme();

  const svgSource = useThemeForImgSource
    ? resolvedTheme === 'dark' // If we want to use the theme for the image source, then dark theme gets white image while light theme gets dark image
      ? '/svg/github-mark-white.svg'
      : '/svg/github-mark.svg'
    : colour === 'white' // If don't use theme for image source, we base it off the passed in prop deciding the colour of the image to use
      ? '/svg/github-mark-white.svg'
      : '/svg/github-mark.svg';

  const darkModeStyle =
    colour === undefined && !useThemeForImgSource ? 'dark:invert' : ''; // if no colour is passed in and no theme override, we automatically invert so it matches the dark mode colours

  return (
    <div className={cn('h-6 w-6', darkModeStyle, className)}>
      <Image src={svgSource} alt='GitHub Icon' width={24} height={24} />
    </div>
  );
};

export default GitHubIcon;
