import { GitHubLink, LinkedInLink } from '@/constant/socials';
import type { PostMeta } from '@/lib/blog/github';
import type { TProjectShowcase } from '@/types/projects/ProjectShowcase';

import { absoluteUrl, SITE, SITE_URL } from '../seo';

/** Stable @id for the Person node, referenced by @id everywhere else. */
export const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function buildPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.author,
    jobTitle: SITE.jobTitle,
    url: SITE_URL,
    sameAs: [GitHubLink, LinkedInLink],
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: SITE_URL,
    publisher: { '@id': PERSON_ID },
  };
}

export function buildProfilePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: { '@id': PERSON_ID },
  };
}

export function buildBlogJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${SITE.name} — Blog`,
    url: absoluteUrl('/blog'),
    author: { '@id': PERSON_ID },
  };
}

/** Omit entirely for locked posts — same rule as the OG image. */
export function buildBlogPostingJsonLd(post: PostMeta) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description ?? post.excerpt,
    datePublished: post.date ? new Date(post.date).toISOString() : undefined,
    dateModified: post.date ? new Date(post.date).toISOString() : undefined,
    author: { '@id': PERSON_ID },
    keywords: post.tags?.join(', '),
    image: absoluteUrl(`/blog/${post.slug}/opengraph-image`),
    mainEntityOfPage: url,
    url,
  };
}

export function buildProjectItemListJsonLd(projects: TProjectShowcase[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: projects
      .filter((project) => project.href)
      .map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: project.name,
        url: absoluteUrl(project.href!),
      })),
  };
}

export function buildBreadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
