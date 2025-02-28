'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface ThemeContextType {
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * This theme provider was made to deal with `useTheme` from `next-themes` returning 'light', 'dark', or 'system'
 * In order for some custom logic to occur (which checks if it's light or dark), we need to resolve 'system' to the actual theme the user has
 * This context helps provide that information to any components who need to know it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Every time this provider mounts, we want it to check what the theme is based on the media query `prefers-color-scheme`, and resolve `system` to `light` or `dark`
  useEffect(() => {
    // Resolves theme to light or dark if it is system, else just set theme to whatever it is.
    const checkSystemTheme = () => {
      if (theme === 'system') {
        const darkModeMediaQuery = window.matchMedia(
          '(prefers-color-scheme: dark)',
        );
        setResolvedTheme(darkModeMediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme as 'light' | 'dark');
      }
    };

    checkSystemTheme();

    // Listen for changes in system theme (if we didn't do this, other components couldn't use the resolved theme for when the theme changes)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkSystemTheme();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange); // clean up the event listener
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useResolvedTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useResolvedTheme must be used within a ThemeProvider');
  }
  return context;
}
