import type { Metadata } from 'next';

import { SparkleField } from '@/components/backgrounds/SparkleField';
import { NotFoundContent } from '@/components/not-found/NotFoundContent';

/**
 * Deliberately not pageMetadata(): a 404 has no canonical URL of its own and
 * shouldn't be indexed, so it skips the canonical/OG block the real pages get.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  description: "That page doesn't exist - head back home to keep browsing.",
  robots: { index: false, follow: false },
};

/**
 * Root not-found page. Next renders this both for `notFound()` calls (e.g. a
 * blog slug that doesn't resolve) and for any URL that matches no route at all.
 *
 * Deliberately not `page-shell`: its min-h-screen would push the footer a full
 * navbar+footer's worth below the fold. The navbar and the footer are both
 * sticky - so both sit in normal flow and take real height - which means
 * subtracting them from the viewport here is what lets the whole page (card
 * centered, footer included) land in one screen with nothing to scroll to.
 * Roughly ~2.5rem navbar + ~2.5rem footer on desktop; the footer stacks to
 * ~9.5rem below md.
 */
export default function NotFound() {
  return (
    <main className='bg-background page-padding-x relative flex min-h-[calc(100dvh-12rem)] items-center justify-center overflow-hidden py-10 md:min-h-[calc(100dvh-6rem)] md:py-12'>
      <div className='pointer-events-none absolute inset-0'>
        <SparkleField />
      </div>

      <NotFoundContent />
    </main>
  );
}
