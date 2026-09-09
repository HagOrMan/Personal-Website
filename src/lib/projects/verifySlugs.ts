import fs from 'node:fs';
import path from 'node:path';

import type { TProjectShowcase } from '@/types/projects/ProjectShowcase';

import 'server-only';

/**
 * Every slug that claims `hasDetailPage` must have a real /projects/[slug]
 * route. The projects index is statically generated, so calling this from
 * that page runs it during `pnpm build` — a "Read more" that would 404 fails
 * the build instead of shipping.
 *
 * Projects without the flag are skipped: nothing links to them, so a missing
 * route is no longer a broken promise — it's just a project whose write-up
 * hasn't been started. That's what makes the flag safe to turn on last: the
 * build catches you flipping it before the page exists.
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
    .filter((project) => project.hasDetailPage)
    .map((project) => project.slug)
    .filter((slug) => !routes.includes(slug));

  if (missing.length > 0) {
    throw new Error(
      `[projects] hasDetailPage is set but no route exists for ${missing.length === 1 ? 'slug' : 'slugs'}: ${missing.join(', ')}. ` +
        `Add src/app/projects/<slug>/page.tsx, fix the slug, or drop hasDetailPage in src/constant/projects.ts.`,
    );
  }
}
