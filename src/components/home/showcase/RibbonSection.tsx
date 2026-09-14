import type { ReactNode } from 'react';
import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

/**
 * The frame around one half of the ribbon: a heading, its rows, and the link
 * out to the page that has all of them.
 *
 * `overflow-x-clip` rather than `overflow-hidden`, and the axis is the whole
 * point. The aurora behind each row is deliberately wider and taller than the
 * row: clipping it horizontally is what stops a glow hanging off the margin
 * from turning into a page that scrolls sideways, while leaving the vertical
 * free is what stops the same glow being sliced flat along the section's top
 * and bottom edges. `clip` is what allows that pairing — `overflow-x: hidden`
 * would quietly force the other axis to `auto` and reintroduce the cut.
 */
export function RibbonSection({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  /** Where "see all" goes. */
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className='relative w-full overflow-x-clip py-16 md:py-24'>
      <div className='mx-auto w-full max-w-5xl px-6 md:px-10'>
        {/* The shimmer goes on an inline-block span rather than on the heading
            itself: background-clip: text still sizes its gradient to the
            element's box, so on a block-level h2 the sweep would be spread
            across the full column and most of each pass would happen in the
            empty space beside the words. */}
        <h2 className='mb-10 text-3xl font-bold md:mb-14 md:text-4xl'>
          <span className='shimmer-heading inline-block'>{title}</span>
        </h2>

        {/* Rows draw their own separators — see RibbonRow's showDivider. */}
        <div className='flex flex-col'>{children}</div>

        {/* Same shape as the recommendations section's link out, and in the
            same place, so all three sections end the same way. */}
        <Link
          href={href}
          className='text-breeze-900/80 hover:text-breeze-700 dark:text-breeze-300/75 dark:hover:text-breeze-300 group/all mt-12 inline-flex items-center gap-2 text-sm motion-safe:transition-colors md:mt-16'
        >
          {linkLabel}
          <ArrowRight
            className='size-4 transition-transform duration-200 group-hover/all:translate-x-0.5'
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}
