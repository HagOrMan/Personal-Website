import ReactMarkdown from 'react-markdown';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';

import rehypeExternalLinks from 'rehype-external-links';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { BlogPostHeader } from '@/components/blog/BlogPostHeader';
import { PostPasswordForm } from '@/components/blog/PostPasswordForm';
import { recordViewAfterResponse } from '@/lib/blog/analytics';
import { resolveAccess } from '@/lib/blog/auth';
import { getPost } from '@/lib/blog/github';
import { rewriteContentPaths } from '@/lib/blog/rewriteContentPaths';

// Both /blog/my-first-post and /blog/MyFirstPost resolve; unknown slugs
// render on-demand and get redirected below (or 404 if no file matches).
export const dynamicParams = true;

// hasAccess() reads cookies() (directly, and via the Supabase server
// client), which already opts this route into fully dynamic rendering - no
// need for `export const dynamic = 'force-dynamic'`. The underlying GitHub
// content fetches still hit the tagged Data Cache.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  if (post.meta.locked) {
    return { title: post.meta.title, robots: { index: false, follow: false } };
  }

  return { title: post.meta.title, description: post.meta.description };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  // Canonicalize: if the visitor arrived via any non-kebab form
  // (e.g. /blog/MyFirstPost), 308-redirect to the canonical slug.
  if (slug !== post.meta.slug) permanentRedirect(`/blog/${post.meta.slug}`);

  const { isOwner, canAccess } = await resolveAccess(
    post.meta.slug,
    post.meta.locked,
  );

  // Fire-and-forget view analytics. Runs after the response via after(), fully
  // error-swallowed, skipped for the owner and bots. `hadAccess` distinguishes
  // "read the post" from "hit the password wall". Recorded here and NOT in the
  // asset proxy, so a post with images still counts as a single view.
  recordViewAfterResponse({
    slug: post.meta.slug,
    wasLocked: post.meta.locked,
    hadAccess: canAccess,
    isOwner,
    headers: await headers(),
  });

  if (!canAccess) {
    return (
      <main className='bg-background page-shell'>
        <div className='mx-auto w-full max-w-[72ch]'>
          <BlogPostHeader
            title={post.meta.title}
            description={post.meta.description}
            date={post.meta.date}
          />
          <PostPasswordForm slug={post.meta.slug} />
        </div>
      </main>
    );
  }

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto w-full max-w-[72ch]'>
        <BlogPostHeader
          title={post.meta.title}
          description={post.meta.description}
          tags={post.meta.tags}
          date={post.meta.date}
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
            {rewriteContentPaths(post.content, post.meta.slug)}
          </ReactMarkdown>
        </article>
      </div>
    </main>
  );
}
