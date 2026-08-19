'use client';

import { useEffect } from 'react';

/**
 * How long to keep the target pinned after arriving. Post images come through
 * the asset proxy without intrinsic dimensions, so content above the heading
 * keeps growing as they decode - a single jump lands correctly and then
 * drifts. Re-anchoring for about a second covers that.
 */
const HOLD_MS = 1200;

/**
 * Input that means the reader has taken over. A `scroll` listener would be
 * useless here, since our own scrolling fires it too - these are the events
 * that *produce* a scroll, and none of them can come from us.
 */
const ABORT_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

/** The fragment without its `#`, or '' when the URL carries none. */
function targetId(): string {
  const raw = window.location.hash.slice(1);
  if (!raw) return '';
  // A heading with non-ASCII text percent-encodes into the URL. A stray `%`
  // in a hand-written link throws instead, and the raw form is the better
  // guess at that point.
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Lands the reader on `#some-heading` when a post is opened straight from an
 * anchor link - a copied table-of-contents link, or a cross-post link like
 * `/blog/other-post#extra-notes`.
 *
 * The browser tries this exactly once, while the initial document is parsing,
 * and never retries for DOM that arrives later by script. This route is fully
 * dynamic (auth reads cookies) and has a loading.tsx, so on a cache miss the
 * GitHub fetch is slow enough that React flushes the skeleton first and
 * streams the article in afterwards. The browser's one attempt finds only
 * skeletons and gives up - which is why the same URL scrolls fine on a
 * refresh, once the post is warm in the Data Cache and the article ships in
 * the first flush.
 *
 * Renders nothing, and sits inside the article branch so it hydrates with the
 * headings it looks for already in the DOM.
 */
export function ScrollToHash() {
  useEffect(() => {
    const id = targetId();
    if (!id) return;

    // Only ever take over from a standing start. Anything else means either
    // the browser's own attempt worked or the reader has already moved, and
    // in both cases the page is where somebody put it deliberately - a second
    // jump could only make that worse.
    if (window.scrollY > 0) return;

    const deadline = performance.now() + HOLD_MS;
    let frame = 0;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      for (const event of ABORT_EVENTS) {
        window.removeEventListener(event, stop);
      }
    };

    const tick = () => {
      // `instant` on purpose: html:has(.blog-prose) turns on smooth scrolling
      // (globals.css), and animating the whole document down from the top is
      // not what following a link should feel like - a plain anchor load just
      // arrives. scroll-margin-top on the heading clears the navbar, and a
      // repeat call once nothing is shifting is a no-op.
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });

      if (performance.now() < deadline) {
        frame = requestAnimationFrame(tick);
      } else {
        stop();
      }
    };

    for (const event of ABORT_EVENTS) {
      window.addEventListener(event, stop, { passive: true });
    }
    tick();

    return stop;
  }, []);

  return null;
}
