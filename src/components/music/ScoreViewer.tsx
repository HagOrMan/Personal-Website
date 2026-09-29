'use client';

import { useState } from 'react';

import { ZoomIn, ZoomOut } from 'lucide-react';

import { actionVariants } from '@/components/ui/actionVariants';
import { cn } from '@/lib/utils';

type ScoreViewerProps = {
  title: string;
  /** Page image URLs, in order. */
  pages: string[];
  pageWidth: number;
  pageHeight: number;
};

/** Pages above this index load immediately; the rest wait for the scroll. */
const EAGER_PAGES = 2;

/**
 * The score as a column of page images. Plain <img> rather than next/image:
 * the pages are SVG, which the optimizer won't touch, and they're already
 * served from R2 with year-long caching.
 *
 * Below lg a page fitted to a phone's width is small print, so there's a
 * zoom toggle that renders pages wider and lets each scroll sideways. Pinch
 * zoom still works on top of either; there's deliberately no custom pan
 * surface.
 */
export function ScoreViewer({
  title,
  pages,
  pageWidth,
  pageHeight,
}: ScoreViewerProps) {
  const [zoomed, setZoomed] = useState(false);
  const total = pages.length;

  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='mb-3 flex items-center justify-between gap-4 lg:hidden'>
        <span className='text-muted-foreground text-sm'>
          {total} {total === 1 ? 'page' : 'pages'}
        </span>
        <button
          type='button'
          aria-pressed={zoomed}
          onClick={() => setZoomed((value) => !value)}
          className={actionVariants({
            variant: 'outline',
            className: 'cursor-pointer',
          })}
        >
          {zoomed ? (
            <ZoomOut aria-hidden className='size-3.5' />
          ) : (
            <ZoomIn aria-hidden className='size-3.5' />
          )}
          {zoomed ? 'Fit to width' : 'Zoom in'}
        </button>
      </div>

      <ol role='list' className='flex flex-col gap-6'>
        {pages.map((src, index) => {
          const label = `Page ${index + 1} of ${total}, ${title}`;
          return (
            <li key={src}>
              <figure className='flex flex-col gap-2'>
                <div
                  className={cn(
                    'border-border overflow-hidden rounded-xl border bg-white',
                    zoomed && 'max-lg:overflow-x-auto',
                  )}
                  // A scrollable region has to be focusable, or keyboard
                  // users can't reach the part of the page off to the side.
                  tabIndex={zoomed ? 0 : undefined}
                  role={zoomed ? 'region' : undefined}
                  aria-label={zoomed ? label : undefined}
                >
                  <img
                    src={src}
                    alt={label}
                    width={pageWidth}
                    height={pageHeight}
                    loading={index < EAGER_PAGES ? 'eager' : 'lazy'}
                    decoding='async'
                    className={cn(
                      'block h-auto w-full',
                      zoomed && 'max-lg:w-[56rem] max-lg:max-w-none',
                    )}
                  />
                </div>
                {/* Hidden from screen readers: the alt text already says it. */}
                <figcaption
                  aria-hidden
                  className='text-muted-foreground text-center text-xs'
                >
                  Page {index + 1} of {total}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
