import { Skeleton } from '@/components/ui/Skeleton';

// The index is built from listPosts(), which reads every post's markdown
// through the GitHub API - fast on a warm Data Cache, a visible wait when
// cold. Mirrors the real layout (72ch column, gap-8, gap-6 rows) so the swap
// to content doesn't shift anything.

const PLACEHOLDER_ROWS = 5;

function PostRowSkeleton() {
  return (
    <li className='border-border flex flex-col gap-2 border-b pb-6 last:border-none'>
      <Skeleton className='h-6 w-2/3' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-3 w-32' />
      <div className='mt-1 flex gap-1.5'>
        <Skeleton className='h-5 w-16 rounded-full' />
        <Skeleton className='h-5 w-20 rounded-full' />
      </div>
    </li>
  );
}

export default function Loading() {
  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-[72ch] flex-col gap-8'>
        <div className='flex items-center justify-between gap-4'>
          <h1 className='text-foreground text-4xl font-bold tracking-tight md:text-5xl'>
            Blog
          </h1>
          <Skeleton className='size-5 shrink-0' />
        </div>

        {/* Tag filter row */}
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className='h-6 w-20 rounded-full' />
          ))}
        </div>

        <ul className='flex flex-col gap-6'>
          {Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => (
            <PostRowSkeleton key={i} />
          ))}
        </ul>
      </div>
    </main>
  );
}
