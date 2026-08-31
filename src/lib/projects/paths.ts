import type { TProjectShowcase } from '@/types/projects/ProjectShowcase';

export const PROJECTS_BASE_PATH = '/projects';

/**
 * The one place a project's detail-page URL is built. Every slug is asserted
 * against the real route directories at build time — see verifySlugs.ts.
 */
export function projectHref(project: Pick<TProjectShowcase, 'slug'>): string {
  return `${PROJECTS_BASE_PATH}/${project.slug}`;
}
