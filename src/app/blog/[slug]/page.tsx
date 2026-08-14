import { type ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';

import rehypeExternalLinks from 'rehype-external-links';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { BlogPostHeader } from '@/components/blog/BlogPostHeader';
import { PostPasswordForm } from '@/components/blog/PostPasswordForm';
import { TocCompact, TocRail } from '@/components/blog/TableOfContents';
import { recordViewAfterResponse } from '@/lib/blog/analytics';
import { resolveAccess } from '@/lib/blog/auth';
import { getPost, type Post } from '@/lib/blog/github';
import { estimateReadTime } from '@/lib/blog/readTime';
import { rewriteContentPaths } from '@/lib/blog/rewriteContentPaths';
import { extractTocHeadings } from '@/lib/blog/toc';
import { cn } from '@/lib/utils';

// Both /blog/my-first-post and /blog/MyFirstPost resolve; unknown slugs
// render on-demand and get redirected below (or 404 if no file matches).
export const dynamicParams = true;

type RehypePlugins = ComponentProps<typeof ReactMarkdown>['rehypePlugins'];

/**
 * Raw HTML is allowed through (posts use <details>, <sup>, and friends), but
 * only content from a trusted source is rendered unsanitized. A public source
 * takes outside pull requests, and this site serves it from the same origin as
 * the owner session and unlock cookies - so a merged contribution must not be
 * able to run script here.
 *
 * Order matters: rehypeSanitize sits directly after rehypeRaw so injected HTML
 * is cleaned before anything else looks at it, and rehypeSlug runs *after*
 * sanitizing because the default schema clobbers author-supplied `id`s with a
 * `user-content-` prefix. Slugging afterwards leaves heading ids untouched, so
 * in-page anchors like [notes](#extra-notes) still land.
 */
function rehypePluginsFor(post: Post): RehypePlugins {
  return [
    rehypeRaw,
    ...(post.source.trusted ? [] : [rehypeSanitize]),
    rehypeSlug,
    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
  ];
}

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

  // Empty when the post opted out or has too little structure to navigate,
  // in which case the layout below collapses back to a plain centred column.
  // Read off the raw content rather than the rewritten copy below - path
  // rewriting only touches link/image targets, never heading text, so the
  // slugs still line up with what rehypeSlug puts on the rendered headings.
  const headings = post.meta.toc ? extractTocHeadings(post.content) : [];
  const hasToc = headings.length > 0;

  return (
    <main className='bg-background page-shell'>
      {/* Narrow: one centred column. From xl there's real room beside the
          72ch measure, so the rail takes it and the pair centres together. */}
      <div
        className={cn(
          'mx-auto w-full max-w-[72ch]',
          // 72ch article + 3rem gap + 14rem rail, so the pair stays centred.
          hasToc &&
            'xl:grid xl:max-w-[calc(72ch+17rem)] xl:grid-cols-[minmax(0,72ch)_14rem] xl:gap-12',
        )}
      >
        <div className='min-w-0'>
          <BlogPostHeader
            title={post.meta.title}
            description={post.meta.description}
            tags={post.meta.tags}
            date={post.meta.date}
            readTimeMinutes={estimateReadTime(post.content)}
            sourceUrl={post.meta.sourceUrl}
            sourceLabel={post.meta.sourceLabel}
          />

          {hasToc && <TocCompact headings={headings} className='mb-8 xl:hidden' />}

          <article className='blog-prose'>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={rehypePluginsFor(post)}
            >
              {rewriteContentPaths(post.content, {
                slug: post.meta.slug,
                postPath: post.postPath,
                source: post.source,
              })}
            </ReactMarkdown>
          </article>
        </div>

        {hasToc && <TocRail headings={headings} className='hidden xl:block' />}
      </div>
    </main>
  );
}
