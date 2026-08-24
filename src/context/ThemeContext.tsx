'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';

interface ThemeContextType {
  /**
   * Always a concrete 'light' | 'dark' - never 'system'.
   *
   * Deliberately 'light' on the server *and* on the first client render, so the
   * two agree and hydration stays clean. It flips to the real value in the
   * commit after mount. Consumers that would visibly flash on that flip should
   * branch on `isThemeReady` instead of rendering theme-dependent output
   * straight away.
   */
  resolvedTheme: 'light' | 'dark';
  /**
   * False until the real theme is known on the client. Branch on this to hold
   * back anything whose light-mode default would be visibly wrong for a
   * dark-mode visitor - fade in once it is true rather than letting the output
   * pop from one palette to the other.
   */
  isThemeReady: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Resolves next-themes' three-way preference ('light' | 'dark' | 'system') down
 * to the concrete theme actually in effect, for the components that need it as
 * a value rather than as a CSS class - Three.js palettes and the icons whose
 * image source swaps with the theme.
 *
 * This does NOT gate its children on mount. Blocking the tree until mounted is
 * what left the whole site server-rendering an empty shell; the value is gated
 * instead, so pages still SSR in full. See src/components/ui/ThemeProvider.tsx
 * for the longer note.
 *
 * next-themes already resolves 'system' against `prefers-color-scheme` and
 * keeps that in sync when the OS setting changes, so this reads its
 * `resolvedTheme` rather than running a second matchMedia listener of its own.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  // next-themes populates resolvedTheme in an effect, so it is undefined on the
  // server. Tracking mount explicitly keeps the first client render identical
  // to the server's regardless of how next-themes seeds its state internally.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    const isReady =
      mounted && (resolvedTheme === 'light' || resolvedTheme === 'dark');
    return {
      resolvedTheme: isReady ? resolvedTheme : 'light',
      isThemeReady: isReady,
    };
  }, [mounted, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useResolvedTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useResolvedTheme must be used within a ThemeProvider');
  }
  return context;
}
