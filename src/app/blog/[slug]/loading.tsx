import { Skeleton } from '@/components/ui/Skeleton';

// Mirrors the post layout's centred 72ch column. The table-of-contents rail
// is deliberately not stubbed: whether a post has one depends on its
// headings, so reserving space for it would shift the article sideways on
// every post that opts out.

const PROSE_LINES = 8;

export default function Loading() {
  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto w-full max-w-[72ch]'>
        <header className='mb-8 flex flex-col gap-4'>
          <Skeleton className='h-10 w-4/5 md:h-12' />
          <Skeleton className='h-6 w-full max-w-2xl' />

          {/* Meta row: author · date · read time */}
          <div className='flex flex-wrap items-center gap-3'>
            <Skeleton className='h-4 w-36' />
            <Skeleton className='h-4 w-28' />
            <Skeleton className='h-4 w-24' />
          </div>

          <div className='flex flex-wrap gap-2'>
            <Skeleton className='h-5 w-16 rounded-full' />
            <Skeleton className='h-5 w-20 rounded-full' />
          </div>
        </header>

        <div className='flex flex-col gap-3'>
          {Array.from({ length: PROSE_LINES }, (_, i) => (
            <Skeleton
              key={i}
              // Ragged right edge every few lines, so it reads as prose
              // rather than as a block of identical bars.
              className={i % 4 === 3 ? 'h-4 w-3/5' : 'h-4 w-full'}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
