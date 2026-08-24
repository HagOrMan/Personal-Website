'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Thin seam over next-themes so the rest of the app imports the provider from
 * one place.
 *
 * IMPORTANT: do not add a `if (!mounted) return <Loading/>` gate here. This
 * provider wraps PageLayout, which wraps every page, so gating it means the
 * server renders an empty shell for the *entire site* - the HTML Googlebot
 * receives on its first pass contains no headings, no prose, and no links, and
 * the content only exists in the RSC payload that a second, rationed JS render
 * pass has to execute. That is what put most of /blog into "Discovered -
 * currently not indexed" in Search Console.
 *
 * The gate is not needed for page theming either: with attribute='class',
 * next-themes injects a blocking script that sets `class="dark"` on <html>
 * before first paint, and every token in globals.css hangs off `html.dark`
 * (see globals.css:419). CSS handles light/dark - including 'system' - with no
 * React involvement at all.
 *
 * Components that need the theme as a *JavaScript value* (Three.js colours, the
 * theme-swapped icon sources) read it from ThemeContext, which gates the value
 * rather than the tree. See src/context/ThemeContext.tsx.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
