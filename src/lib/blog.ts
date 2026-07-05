// src/lib/blog.ts
//
// Blog helpers for reading PascalCase-named markdown files out of src/_blog/.
//
// Requires: gray-matter   ->  npm install gray-matter
// The page layer additionally needs: react-markdown remark-gfm
//
// URL model: canonical slug is kebab-case, but the resolver normalizes any
// incoming slug (PascalCase OR kebab) so both /blog/MyFirstPost and
// /blog/my-first-post resolve to the same file. (Add a canonical tag or a
// redirect at the page layer if you care about SEO duplicate-content.)

import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'src', '_blog');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostFrontmatter {
  tags?: string[];
  date?: string;
  description?: string;
  // Anything else you drop into the YAML frontmatter passes through untouched.
  [key: string]: unknown;
}

/** Metadata only — used for the blog index / listing page. */
export interface PostMeta {
  slug: string; // canonical kebab-case slug, e.g. "my-first-post"
  fileName: string; // PascalCase base name, e.g. "MyFirstPost"
  title: string; // formatted title, e.g. "My First Post"
  rawTitle: string; // same as fileName, in case you'd rather show the raw name
  frontmatter: PostFrontmatter; // raw YAML passthrough; tags live at frontmatter.tags
}

/** Full post — metadata plus the raw markdown body for react-markdown. */
export interface Post extends PostMeta {
  content: string; // raw markdown, frontmatter stripped
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Normalize a name into a kebab-case slug.
 * Idempotent: works on PascalCase ("MyFirstPost"), spaces, or existing kebab.
 *   "MyFirstPost"   -> "my-first-post"
 *   "my-first-post" -> "my-first-post"
 *   "HTMLParserGuide" -> "html-parser-guide"
 */
export function slugify(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camel boundary: My|First
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // acronym boundary: HTML|Parser
    .replace(/[\s_]+/g, '-') // spaces / underscores -> hyphen
    .replace(/-+/g, '-') // collapse repeats
    .toLowerCase()
    .replace(/^-|-$/g, ''); // trim edges
}

/**
 * Turn a PascalCase file name into a spaced, human title.
 *   "MyFirstPost" -> "My First Post"
 * (You can ignore this and use `rawTitle` if you decide to show the file name.)
 */
export function formatTitle(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

/** All markdown file base names (no extension) in the blog dir. */
function getFileNames(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/** Resolve an incoming slug (any case format) back to its actual file name. */
function resolveFileName(slug: string): string | null {
  const target = slugify(slug);
  return getFileNames().find((name) => slugify(name) === target) ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Every post's canonical slug. Feed this into `generateStaticParams`:
 *   export function generateStaticParams() {
 *     return getPostSlugs().map((slug) => ({ slug }));
 *   }
 */
export function getPostSlugs(): string[] {
  return getFileNames().map(slugify);
}

/**
 * Load a single post by slug. Returns null if no file matches, so the page
 * can call notFound(). Accepts PascalCase or kebab-case slugs interchangeably.
 */
export function getPostBySlug(slug: string): Post | null {
  const fileName = resolveFileName(slug);
  if (!fileName) return null;

  const fullPath = path.join(BLOG_DIR, `${fileName}.md`);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(raw);
  const frontmatter = data as PostFrontmatter;

  return {
    slug: slugify(fileName),
    fileName,
    rawTitle: fileName,
    title: formatTitle(fileName),
    frontmatter,
    content,
  };
}

/**
 * Metadata for every post, for the blog index page. Sorted by frontmatter
 * `date` (newest first) when present, otherwise alphabetically by title.
 * Body content is intentionally omitted to keep the listing light — swap the
 * return type to Post[] and add `content` if you want excerpts.
 */
export function getAllPosts(): PostMeta[] {
  const posts: PostMeta[] = getFileNames().map((fileName) => {
    const fullPath = path.join(BLOG_DIR, `${fileName}.md`);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(raw);
    const frontmatter = data as PostFrontmatter;

    return {
      slug: slugify(fileName),
      fileName,
      rawTitle: fileName,
      title: formatTitle(fileName),
      frontmatter,
    };
  });

  return posts.sort((a, b) => {
    const da = a.frontmatter.date;
    const db = b.frontmatter.date;
    if (da && db) {
      return (
        new Date(db as string).getTime() - new Date(da as string).getTime()
      );
    }
    return a.title.localeCompare(b.title);
  });
}
