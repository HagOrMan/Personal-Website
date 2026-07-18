import { Suspense } from 'react';

import { Rss } from 'lucide-react';

import { BlogIndexClient } from '@/components/blog/BlogIndexClient';
import { listPosts } from '@/lib/blog/github';

export default async function BlogPage() {
  const posts = await listPosts();

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-[72ch] flex-col gap-8'>
        <div className='flex items-center justify-between gap-4'>
          <h1 className='text-foreground text-4xl font-bold tracking-tight md:text-5xl'>
            Blog
          </h1>
          <a
            href='/blog/feed.xml'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='RSS feed'
            title='RSS feed'
            className='text-muted-foreground hover:text-primary shrink-0 transition-colors'
          >
            <Rss className='size-5' />
          </a>
        </div>

        {posts.length === 0 ? (
          <p className='text-muted-foreground'>
            No posts yet — check back soon.
          </p>
        ) : (
          // useSearchParams() inside BlogIndexClient needs a Suspense
          // boundary when this page is prerendered.
          <Suspense>
            <BlogIndexClient posts={posts} />
          </Suspense>
        )}
      </div>
    </main>
  );
}
