import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import type { TProjectShowcase } from '@/types/projects/ProjectShowcase';

/**
 * Every slug in constant/projects.ts must have a real /projects/[slug] route.
 * The projects index is statically generated, so calling this from that page
 * runs it during `pnpm build` — a card that would 404 fails the build instead
 * of shipping.
 *
 * Detail pages are hand-written and out of scope for the index: this only
 * checks that the directory exists, never what's inside it.
 */
export function assertProjectRoutesExist(projects: TProjectShowcase[]): void {
  const routesDir = path.join(process.cwd(), 'src', 'app', 'projects');

  let routes: string[];
  try {
    routes = fs
      .readdirSync(routesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    // The source tree isn't on disk (a bundled runtime render, say). There's
    // nothing to check against, and failing here would take down a page that
    // already built cleanly.
    return;
  }

  const missing = projects
    .map((project) => project.slug)
    .filter((slug) => !routes.includes(slug));

  if (missing.length > 0) {
    throw new Error(
      `[projects] No detail page found for ${missing.length === 1 ? 'slug' : 'slugs'}: ${missing.join(', ')}. ` +
        `Add src/app/projects/<slug>/page.tsx, or fix the slug in src/constant/projects.ts.`,
    );
  }
}
