import { RefObject, useEffect, useState } from 'react';

// --- Utility Hook for Responsive Animations ---
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);

    // Seed from the real value on mount. Both SSR and the first client render
    // have to say `false` - there's no `window` on the server and disagreeing
    // with it would be a hydration mismatch - so this is the first honest
    // chance to read the query.
    sync();

    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
    // `matches` is deliberately not a dependency: listing it tore the listener
    // down and re-subscribed it on every single change.
  }, [query]);

  return matches;
}

/** True when the visitor has requested reduced motion at the OS/browser level. */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * True while `ref`'s element is in (or near) the viewport *and* the tab is
 * foregrounded. This is the gate for anything running a per-frame render loop,
 * so a decorative canvas isn't burning the main thread while it's scrolled
 * past or sitting in a background tab.
 *
 * Starts `true` on purpose: IntersectionObserver's first callback is async, so
 * defaulting to `false` would skip the first paint of whatever this gates. If
 * the element really is off-screen the observer corrects it within a frame.
 */
export function useIsOnScreen(
  ref: RefObject<Element | null>,
  /**
   * Resume this far before the element scrolls back into view, so there's no
   * visibly frozen frame at the edge of the viewport.
   */
  rootMargin = '128px',
) {
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Tracked outside state so `visibilitychange` and the observer can each
    // re-evaluate the pair without needing the other's latest render.
    let isIntersecting = true;
    const sync = () => setOnScreen(isIntersecting && !document.hidden);

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { rootMargin },
    );

    observer.observe(element);
    document.addEventListener('visibilitychange', sync);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ref, rootMargin]);

  return onScreen;
}
