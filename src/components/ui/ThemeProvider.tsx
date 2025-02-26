'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Background: using themes to determine some info (like image to toggle theme) gives hydration error due to loading one image and then another in client once theme is loaded
  // To counteract this, there is nothing loaded in this provider until it is mounted on the client, preventing the hydration error.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className='invisible'>Loading...</div>; // Prevents mismatched HTML in items that require the theme and give hydration errors
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
