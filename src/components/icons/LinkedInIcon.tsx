'use client';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/context/ThemeContext';

type LinkedInIconProps = {
  className?: string;
  theme?: 'light' | 'dark' | 'main'; // main theme is the blue theme that has their standard colour blue
};

const LinkedInIcon = ({ className, theme: themeProps }: LinkedInIconProps) => {
  const { resolvedTheme: theme } = useResolvedTheme();
  const currentTheme = themeProps || theme;
  const imgSource =
    currentTheme === 'dark'
      ? '/png/InBug-White.png'
      : currentTheme === 'light'
        ? '/png/InBug-Black.png'
        : '/png/LI-In-Bug.png';

  return (
    <Image
      className={cn(className, 'object-contain')}
      src={imgSource}
      alt='LinkedIn Icon'
      width={currentTheme === 'main' ? 32 : 24} // Adjust width for main theme (since it's smaller than the others)
      height={currentTheme === 'main' ? 32 : 24} // ^
    />
  );
};

export default LinkedInIcon;
