// Moved from the old src/lib/blog.ts (local-file blog reader) unchanged -
// the GitHub-backed content layer needs the same PascalCase/kebab
// resolution so existing links keep working.

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
 * (Ignored whenever frontmatter provides an explicit `title`.)
 */
export function formatTitle(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}
