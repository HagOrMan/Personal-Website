import Link from 'next/link';

import { Lock } from 'lucide-react';

import { listPosts } from '@/lib/blog/github';

function formatDate(value?: string): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

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
          <ul className='flex flex-col gap-6'>
            {posts.map((post) => (
              <li
                key={post.slug}
                className='border-border border-b pb-6 last:border-none'
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className='group flex flex-col gap-1'
                >
                  <span className='text-foreground group-hover:text-primary flex items-center gap-2 text-xl font-semibold'>
                    {post.locked && (
                      <Lock
                        className='size-4 shrink-0'
                        aria-label='Password protected'
                      />
                    )}
                    {post.title}
                  </span>

                  {!post.locked && (
                    <>
                      {post.description && (
                        <span className='text-muted-foreground text-sm'>
                          {post.description}
                        </span>
                      )}
                      {post.date && (
                        <span className='text-muted-foreground/70 text-xs'>
                          {formatDate(post.date)}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
