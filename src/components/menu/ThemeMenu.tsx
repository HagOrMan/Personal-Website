'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useResolvedTheme } from '@/context/ThemeContext';

export function ThemeModeToggle() {
  const { setTheme } = useTheme();
  const { resolvedTheme: theme } = useResolvedTheme();

  // Toggle between light and dark
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={toggleTheme}
      aria-label='Toggle theme'
      className='active:bg-accent/85'
    >
      {theme === 'light' ? (
        <Sun className='h-[1.2rem] w-[1.2rem]' />
      ) : (
        <Moon className='h-[1.2rem] w-[1.2rem]' />
      )}
    </Button>
  );
}
