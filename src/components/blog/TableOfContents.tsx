'use client';

import {
  type MouseEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ChevronDown, List } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet';
import type { TocHeading } from '@/lib/blog/toc';
import { cn } from '@/lib/utils';

// Two presentations of the same list, because they live in different places in
// the page. TocRail sits in the empty column beside the article on xl screens
// and follows the reader. TocCompact covers everything narrower: an inline
// disclosure above the article, plus a handle on the right edge that takes
// over once that disclosure has scrolled away. Anchors and smooth scrolling
// come for free - rehypeSlug gives every heading an id and .blog-prose already
// sets scroll-behavior and scroll-margin-top.

type TocProps = {
  headings: TocHeading[];
  className?: string;
};

/** Distance below the viewport top that counts as "you are here" (navbar + air). */
const ACTIVE_OFFSET = 96;

const INDENT = ['', 'pl-3', 'pl-6'] as const;

/**
 * Matches SheetContent's `data-[state=closed]:duration-200`, plus a frame of
 * slack. Radix unmounts the sheet - and releases its scroll lock - only after
 * that exit animation ends, so a jump fired any earlier scrolls a frozen
 * document and is lost. Keep in step with that class.
 */
const SHEET_CLOSE_MS = 250;

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
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
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
 * True once `ref`'s element has left the viewport entirely, false again the
 * moment any part of it returns. Using intersection rather than a scroll
 * threshold is what keeps the handle from strobing when the reader jitters
 * back and forth across the boundary.
 *
 * Observes a plain wrapper rather than the collapsible itself, so expanding
 * the list (which grows the element downward) can't change the answer.
 */
function useScrolledPast(ref: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return past;
}

/**
 * Everything below xl: an inline disclosure above the article, and a handle
 * pinned to the right edge that fades in once that disclosure scrolls out of
 * sight.
 *
 * The two are separate elements rather than one morphing element on purpose.
 * The inline block never leaves the flow, so nothing shifts under the reader
 * at the hand-off, and a cross-fade doesn't have to fight scroll momentum the
 * way an animated width/position change would. Having already met the full
 * list inline is also what makes a bare handle legible later - it isn't a
 * mystery icon, it's where the thing you already saw went.
 */
export function TocCompact({ headings, className }: TocProps) {
  const inlineRef = useRef<HTMLDivElement>(null);
  const detached = useScrolledPast(inlineRef);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeId = useActiveHeading(headings);

  // The sheet locks body scrolling while open and keeps the lock through its
  // close animation, so letting the anchor navigate normally means the jump
  // happens against a frozen document and is simply lost. Close first, scroll
  // once the lock is gone. scrollIntoView still picks up .blog-prose's smooth
  // behaviour and scroll-margin-top, and the pushed hash matches what a plain
  // anchor click would have left in the URL.
  const jumpAfterClose =
    (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      // Let cmd/ctrl/shift/middle clicks open a tab the way they normally
      // would - between md and xl this is still a mouse-driven layout.
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
      setSheetOpen(false);
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView();
        history.pushState(null, '', `#${id}`);
      }, SHEET_CLOSE_MS);
    };

  return (
    <>
      {/* A Radix Collapsible rather than a native <details>: <details> can't
          animate its own open/close (the content is display:none until it
          isn't), so it always snapped. Radix measures the panel and exposes
          the height as a CSS var, which the collapsible-down/up keyframes in
          globals.css animate against - the same pairing VideoTranscriptPanel
          and BlogIndexClient already use. */}
      <div ref={inlineRef} className={className}>
        <Collapsible
          open={inlineOpen}
          onOpenChange={setInlineOpen}
          className='border-border bg-muted/40 rounded-lg border'
        >
          <CollapsibleTrigger className='text-muted-foreground hover:text-foreground focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden'>
            On this page
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 shrink-0 transition-transform duration-200',
                inlineOpen && 'rotate-180',
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className='data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden'>
            <nav aria-label='Table of contents' className='px-4 pt-1 pb-3'>
              <ul>
                {headings.map((heading) => (
                  <li key={heading.id}>
                    {/* Deliberately does NOT collapse on click. This panel
                        sits above the article, so collapsing it shortens the
                        document above the target - and a smooth scroll fixes
                        its destination when it starts, so the animating
                        height would land the reader a panel's worth past the
                        heading. The old <details> got away with this only
                        because it closed instantly, before the jump. The
                        panel is off-screen once you've arrived anyway. */}
                    <TocLink heading={heading} />
                  </li>
                ))}
              </ul>
            </nav>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Vertically centred rather than tucked under the navbar: both navbars
          are sticky top-0 with a control at the right edge, so anything up
          there would read as a third nav button. z-40 keeps it under them.
          The wrapper is inert so it can't swallow taps while empty. */}
      <div className='pointer-events-none fixed top-1/2 right-0 z-40 -translate-y-1/2 xl:hidden'>
        <AnimatePresence>
          {detached && (
            <motion.button
              type='button'
              onClick={() => setSheetOpen(true)}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className='border-border bg-background/95 text-muted-foreground hover:text-foreground focus-visible:ring-ring pointer-events-auto cursor-pointer rounded-l-lg border border-r-0 p-2.5 shadow-md backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
            >
              <List aria-hidden className='size-4' />
              <span className='sr-only'>Open table of contents</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side='right' aria-describedby={undefined}>
          <SheetHeader className='pb-0'>
            <SheetTitle className='text-sm tracking-wider uppercase'>
              On this page
            </SheetTitle>
          </SheetHeader>
          {/* Unlike the inline copy, this one is only ever seen mid-post, so
              the active section is worth marking. */}
          {/* No aria-label here - SheetTitle already names the dialog, and a
              third "Table of contents" landmark would just be noise. */}
          <nav className='scrollbar-hover min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
            <ul>
              {headings.map((heading) => (
                <li key={heading.id}>
                  <TocLink
                    heading={heading}
                    isActive={heading.id === activeId}
                    onNavigate={jumpAfterClose(heading.id)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
