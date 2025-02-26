'use client';
import Image from 'next/image';
import { useTheme } from 'next-themes';

type GitHubIconProps = {
  className?: string;
  theme?: 'light' | 'dark';
};

const GitHubIcon = ({ className, theme: themeProp }: GitHubIconProps) => {
  const { theme } = useTheme();

  const currentTheme = themeProp || theme;
  const svgSource =
    currentTheme === 'dark'
      ? '/svg/github-mark-white.svg'
      : '/svg/github-mark.svg';
  return (
    <div className={`h-6 w-6 ${className}`}>
      <Image src={svgSource} alt='GitHub Icon' width={24} height={24} />
    </div>
  );
};

export default GitHubIcon;
