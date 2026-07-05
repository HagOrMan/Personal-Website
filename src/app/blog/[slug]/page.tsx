import { cache } from 'react';
import ReactMarkdown from 'react-markdown';
import { notFound, permanentRedirect } from 'next/navigation';

import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { PageHeader } from '@/components/layout/PageHeader';
import { getPostBySlug, getPostSlugs } from '@/lib/blog';

// Both /blog/my-first-post and /blog/MyFirstPost resolve; unknown slugs
// render on-demand and get redirected below (or 404 if no file matches).
export const dynamicParams = true;

// Cached so generateMetadata and the page component share one file read
// per request instead of parsing the markdown twice.
const getPost = cache((slug: string) => getPostBySlug(slug));

function formatDate(value: string | Date): string {
  // Defensive: YAML turns an unquoted `date: 2024-01-05` into a Date object,
  // while a quoted date stays a string. new Date() handles both. timeZone
  // 'UTC' keeps the displayed day matching what was authored.
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.frontmatter.description,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  // Canonicalize: if the visitor arrived via any non-kebab form
  // (e.g. /blog/MyFirstPost), 308-redirect to the canonical slug.
  if (slug !== post.slug) permanentRedirect(`/blog/${post.slug}`);

  const tags = post.frontmatter.tags ?? [];
  const date = post.frontmatter.date;

  return (
    <main className='bg-background page-shell justify-items-center'>
      <PageHeader
        title={post.title}
        description={post.frontmatter.description}
      />

      {(tags.length > 0 || date) && (
        <div className='mb-8 flex flex-wrap items-center gap-2'>
          {date && (
            <time
              dateTime={new Date(date as string | Date).toISOString()}
              className='text-muted-foreground text-sm'
            >
              {formatDate(date as string | Date)}
            </time>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className='bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-xs'
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <article className='blog-prose'>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {post.content}
        </ReactMarkdown>
      </article>
    </main>
  );
}
