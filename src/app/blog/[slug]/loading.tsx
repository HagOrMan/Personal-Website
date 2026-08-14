import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// Mirrors the post layout in page.tsx exactly, including its TOC grid: `toc`
// defaults to true for posts (github.ts), so most posts render the
// 72ch-article + 14rem-rail grid at xl. Stubbing both the rail and the
// mobile/tablet disclosure - rather than skipping them because we can't know
// ahead of time whether *this* post opts out - keeps the common case
// (has a TOC) from shifting sideways when the real content swaps in; a
// toc:false post just loses a little reserved space for a moment.

const PROSE_LINES = 8;
const TOC_ITEMS = 6;

function TocRailSkeleton() {
  return (
    <nav
      aria-hidden
      className='sticky top-24 hidden self-start xl:block'
    >
      <Skeleton className='mb-3 h-3 w-24' />
      <ul className='border-border flex flex-col gap-1 border-l pl-3'>
        {Array.from({ length: TOC_ITEMS }, (_, i) => (
          <Skeleton
            key={i}
            className={i % 3 === 1 ? 'h-4 w-4/5' : 'h-4 w-full'}
          />
        ))}
      </ul>
    </nav>
  );
}

function TocCompactSkeleton() {
  return <Skeleton className='mb-8 h-11 w-full rounded-lg xl:hidden' />;
}

export default function Loading() {
  return (
    <main className='bg-background page-shell'>
      <div
        className={cn(
          'mx-auto w-full max-w-[72ch]',
          'xl:grid xl:max-w-[calc(72ch+17rem)] xl:grid-cols-[minmax(0,72ch)_14rem] xl:gap-12',
        )}
      >
        <div className='min-w-0'>
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

          <TocCompactSkeleton />

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

        <TocRailSkeleton />
      </div>
    </main>
  );
}
