import { cache } from 'react';
import ReactMarkdown from 'react-markdown';
import { notFound, permanentRedirect } from 'next/navigation';

import rehypeExternalLinks from 'rehype-external-links';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { BlogPostHeader } from '@/components/blog/BlogPostHeader';
import { getPostBySlug, getPostSlugs } from '@/lib/blog';

// Both /blog/my-first-post and /blog/MyFirstPost resolve; unknown slugs
// render on-demand and get redirected below (or 404 if no file matches).
export const dynamicParams = true;

// Cached so generateMetadata and the page component share one file read
// per request instead of parsing the markdown twice.
const getPost = cache((slug: string) => getPostBySlug(slug));

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
      <BlogPostHeader
        title={post.title}
        description={post.frontmatter.description}
        tags={tags}
        date={date}
      />

      <article className='blog-prose'>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeRaw,
            rehypeSlug,
            [
              rehypeExternalLinks,
              { target: '_blank', rel: ['noopener', 'noreferrer'] },
            ],
          ]}
        >
          {post.content}
        </ReactMarkdown>
      </article>
    </main>
  );
}
