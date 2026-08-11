'use client';

import { useEffect, useRef, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import type { TocHeading } from '@/lib/blog/toc';
import { cn } from '@/lib/utils';

// Two presentations of the same list, because they live in different places in
// the page: TocRail sits in the empty column beside the article on xl screens
// and follows the reader, TocDisclosure sits inline above the article
// everywhere narrower and stays collapsed until asked for. Anchors and smooth
// scrolling come for free - rehypeSlug gives every heading an id and
// .blog-prose already sets scroll-behavior and scroll-margin-top.

type TocProps = {
  headings: TocHeading[];
  className?: string;
};

/** Distance below the viewport top that counts as "you are here" (navbar + air). */
const ACTIVE_OFFSET = 96;

const INDENT = ['', 'pl-3', 'pl-6'] as const;

/**
 * The id of the last heading scrolled past, or null while the reader is still
 * above the first one - highlighting the intro as if it were section one is
 * worse than highlighting nothing.
 */
function useActiveHeading(headings: TocHeading[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Joined rather than the array itself: the parent is a server component, so
  // a fresh array arrives on every render even though the ids never change.
  const idKey = headings.map((heading) => heading.id).join('|');

  useEffect(() => {
    const ids = idKey ? idKey.split('|') : [];
    if (ids.length === 0) return;

    let frame = 0;

    const update = () => {
      frame = 0;

      // A short final section may never reach the offset line, so the bottom
      // of the page always resolves to the last heading.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveId(ids[ids.length - 1]);
        return;
      }

      let current: string | null = null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) continue;
        // ids are in document order, so the first heading still below the
        // line ends the search.
        if (element.getBoundingClientRect().top > ACTIVE_OFFSET) break;
        current = id;
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [idKey]);

  return activeId;
}

function TocLink({
  heading,
  isActive,
  onNavigate,
}: {
  heading: TocHeading;
  isActive?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={`#${heading.id}`}
      onClick={onNavigate}
      aria-current={isActive ? 'location' : undefined}
      className={cn(
        'focus-visible:ring-ring block py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
        INDENT[heading.depth],
        isActive
          ? 'text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {heading.text}
    </a>
  );
}

/**
 * Desktop rail. Sticky within its grid column - `self-start` keeps the box at
 * its content height so it has room to travel inside the column.
 */
export function TocRail({ headings, className }: TocProps) {
  const activeId = useActiveHeading(headings);

  return (
    <nav
      aria-label='Table of contents'
      className={cn('sticky top-24 self-start', className)}
    >
      <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase'>
        On this page
      </p>
      {/* The scroll container sits outside the bordered list: the active
          marker overlaps that border by a pixel, and a negative margin inside
          an overflow box would earn a horizontal scrollbar. */}
      <div className='scrollbar-hover max-h-[calc(100vh-11rem)] overflow-y-auto'>
        <ul className='border-border border-l'>
          {headings.map((heading) => (
            <li key={heading.id}>
              <div
                className={cn(
                  '-ml-px border-l-2 pl-3 transition-colors',
                  heading.id === activeId
                    ? 'border-primary'
                    : 'border-transparent',
                )}
              >
                <TocLink heading={heading} isActive={heading.id === activeId} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/**
 * Mobile / narrow-desktop disclosure. A native <details> so it costs one line
 * of muted text when the reader doesn't want it, and needs no JS to open.
 */
export function TocDisclosure({ headings, className }: TocProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Jumping to a section should leave the list closed behind you, rather than
  // pushing the section you just picked back down the page.
  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <details
      ref={detailsRef}
      className={cn(
        'border-border bg-muted/40 group rounded-lg border',
        className,
      )}
    >
      <summary className='text-muted-foreground hover:text-foreground focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden [&::-webkit-details-marker]:hidden'>
        On this page
        <ChevronDown
          aria-hidden
          className='size-4 shrink-0 transition-transform group-open:rotate-180'
        />
      </summary>
      <nav aria-label='Table of contents' className='px-4 pt-1 pb-3'>
        <ul>
          {headings.map((heading) => (
            <li key={heading.id}>
              <TocLink heading={heading} onNavigate={close} />
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
