import { Suspense } from 'react';

import { BlogIndexClient } from '@/components/blog/BlogIndexClient';
import { listPosts } from '@/lib/blog/github';

export default async function BlogPage() {
  const posts = await listPosts();

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-[72ch] flex-col gap-8'>
        <h1 className='text-foreground text-4xl font-bold tracking-tight md:text-5xl'>
          Blog
        </h1>

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
