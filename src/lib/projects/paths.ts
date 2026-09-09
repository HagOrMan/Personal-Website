import type { TProjectShowcase } from '@/types/projects/ProjectShowcase';

export const PROJECTS_BASE_PATH = '/projects';

/**
 * The one place a project's detail-page URL is built. Every slug that claims
 * a detail page is asserted against the real route directories at build time
 * — see verifySlugs.ts.
 */
export function projectHref(project: Pick<TProjectShowcase, 'slug'>): string {
  return `${PROJECTS_BASE_PATH}/${project.slug}`;
}

/**
 * The detail-page URL, or null when the project hasn't got a page worth
 * sending anyone to yet.
 *
 * Cards, the sitemap, the JSON-LD item list and the route assertion all ask
 * this rather than reading `hasDetailPage` themselves, so "there is nowhere
 * to link" is decided once and can't drift between them.
 */
export function projectDetailHref(
  project: Pick<TProjectShowcase, 'slug' | 'hasDetailPage'>,
): string | null {
  return project.hasDetailPage ? projectHref(project) : null;
}
