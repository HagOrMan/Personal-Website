import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

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
 * Next includes the root not-found boundary in the client entry for *every*
 * route, so importing this statically put the 404's three.js and motion
 * chunks (~200 KiB, unused on every page that isn't a 404) in front of the
 * whole site. dynamic() breaks that static edge; leaving `ssr` on means the
 * 404's copy is still in the HTML for the visitors who actually land here.
 */
const NotFoundContent = dynamic(() =>
  import('@/components/not-found/NotFoundContent').then(
    (m) => m.NotFoundContent,
  ),
);

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
 *
 * `relative` is the positioning context for the SparkleField backdrop, which
 * NotFoundContent mounts.
 */
export default function NotFound() {
  return (
    <main className='bg-background page-padding-x relative flex min-h-[calc(100dvh-12rem)] items-center justify-center overflow-hidden py-10 md:min-h-[calc(100dvh-6rem)] md:py-12'>
      <NotFoundContent />
    </main>
  );
}
