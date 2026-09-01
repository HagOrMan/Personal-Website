'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { preconnect } from 'react-dom';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ChevronDown, Play } from 'lucide-react';
import { animate, motion, useScroll, useTransform } from 'motion/react';

// import { ElectricShockBackground } from '@/components/backgrounds/ElectricShockBackground';
import { HomeIconPopOverlay } from '@/components/home/HomeIconPopOverlay';
import GitHubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { ReferencesSection } from '@/components/references/ReferencesSection';
import { GlitchTextCycle } from '@/components/text/GlitchTextCycle';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { GitHubLink, LinkedInLink } from '@/constant/socials';
import { PORTFOLIO_VIDEOS } from '@/constant/videos';
import { useHomeIconClick } from '@/context/HomeIconClickContext';
import { useMediaQuery, usePrefersReducedMotion } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';

// The ocean is ~100 KiB of three + react-three-fiber for what is, on this
// page, a decorative background. Splitting it keeps that off the critical
// path entirely, and OceanScene already fades itself in once its canvas is
// ready - so arriving a beat later is invisible.
const OceanScene = dynamic(
  () =>
    import('@/components/backgrounds/OceanParticles').then((m) => m.OceanScene),
  { ssr: false },
);

// Same reasoning for the video modal: Radix Dialog plus the whole
// VideoExperience tree used to ship on every visit even though `videoOpen`
// starts false and most visitors never open it. It now mounts on first open,
// with `primeVideo` warming the chunk on hover/focus so the tap that opens it
// isn't waiting on a download.
const VideoModalShell = dynamic(
  () =>
    import('@/components/video/VideoModalShell').then((m) => m.VideoModalShell),
  { ssr: false },
);

// Solid fill (not the muted/tinted pill used for the GitHub/LinkedIn links)
// - this is meant to read as the strongest CTA on the page, not another
// social icon. --primary is already lush-500, so this stays on-palette.
const heroVideoTriggerClasses =
  'group bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_rgb(var(--tw-color-lush-500)/0.5)] hover:bg-primary/95 hover:shadow-[0_4px_28px_-4px_rgb(var(--tw-color-lush-500)/0.7)] flex cursor-pointer items-center gap-3 rounded-full px-6 py-2.5 font-semibold transition-all active:scale-95';

// Hoisted so the array identity is stable across renders. GlitchTextCycle
// resets its visible word whenever `words` changes identity, and an inline
// literal handed it a brand new array on every re-render of this page - which
// snapped the cycle back to "Developer" while its internal index kept
// counting, so the two drifted apart.
const HERO_GLITCH_WORDS = ['Developer', 'Innovator', 'Creator'];

// Number of navbar-logo clicks (see HomeIconClickContext) before we take the
// user to /ocean — they clicked the "ocean icon" enough times to go there.
const CLICKS_TO_OCEAN = 3;
// Give the final pop animation time to play before navigating away.
const OCEAN_REDIRECT_DELAY_MS = 900;

// --- Auto-scroll tuning ---
// The delay used to be 2000ms. Because the bio paragraph below is the page's
// LCP element and starts at opacity 0 until the scroll animation reveals it,
// that delay *was* the LCP: Lighthouse measured a 5.4s "element render delay"
// for text that had been sitting in the DOM the whole time.
const AUTO_SCROLL_START_DELAY_MS = 500;
const AUTO_SCROLL_DURATION_S = 3;
// Mirrors the `start 40px` in the useScroll offset below.
const SCROLL_TRACK_TOP_OFFSET_PX = 40;
// How far along the scroll track the auto-scroll lands, in the same 0-1
// progress space the animations below read from. The photo finishes fading in
// at 0.7 on mobile (0.6 on desktop), so this clears the fade with margin.
// The old `window.innerHeight * 0.8` fell short on phones: `vh` units resolve
// against the *large* viewport while `innerHeight` is the smaller visible one,
// so 0.8 viewport-heights covered noticeably less of a 200vh track than
// intended and left the photo still part-transparent when the scroll stopped.
const AUTO_SCROLL_TARGET_PROGRESS = 0.85;

export default function Home() {
  const containerRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { clickCount, lastClickId, resetClicks } = useHomeIconClick();
  const [videoOpen, setVideoOpen] = useState(false);
  // Once true it stays true, so the modal's exit animation still has a
  // component to play out on after it closes.
  const [videoMounted, setVideoMounted] = useState(false);

  // Check if screen is Large (Desktop)
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const prefersReducedMotion = usePrefersReducedMotion();

  // The server has no viewport, so `isDesktop` is false through SSR and the
  // first client render - which meant the card's resting size was serialised
  // into the HTML at the mobile `75vw`, and a desktop visitor watched a
  // ~1080px-wide card (text hard against its left edge) snap to 300px once the
  // media query resolved. Until this flips, the resting size comes from the
  // classes on the card instead, which the browser resolves at the correct
  // breakpoint before any JS runs. `isDesktop` resolves in the same effect
  // flush as this, so there's no intermediate render at the wrong size.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Warm the modal's chunk and the media origin's DNS/TLS on deliberate
  // intent. Both are cheap to repeat - the bundler caches the import promise
  // and React dedupes the preconnect - so this can hang off every trigger.
  // The preconnect used to fire from inside VideoModalShell on mount, which on
  // this page meant every visitor opened a socket to a host most of them never
  // hit; Lighthouse flagged it as an unused preconnect.
  const primeVideo = useCallback(() => {
    void import('@/components/video/VideoModalShell');
    try {
      preconnect(new URL(PORTFOLIO_VIDEOS[0].src).origin);
    } catch {
      // src isn't an absolute URL (NEXT_PUBLIC_R2_BASE_URL unset locally) -
      // nothing to warm.
    }
  }, []);

  const openVideo = useCallback(() => {
    setVideoMounted(true);
    setVideoOpen(true);
  }, []);

  // Where a given point on the scroll track sits as a document scroll offset -
  // the inverse of the useScroll offset below, so callers can work in the same
  // 0-1 progress space the animations do rather than in viewport-height
  // guesses. Derived from the track's real geometry, which is what makes it
  // hold on phones where `vh` units and `innerHeight` disagree.
  //   progress 0 -> track top sits SCROLL_TRACK_TOP_OFFSET_PX below the viewport top
  //   progress 1 -> track bottom sits at the viewport bottom (the hero's end)
  // Null when the track isn't mounted yet, which callers treat as "do nothing".
  //
  // Declared above the effects that use it: a `const` referenced from a
  // dependency array is read during render, so a later declaration would be a
  // temporal-dead-zone ReferenceError rather than a lint nit.
  const getScrollForProgress = useCallback((progress: number) => {
    const track = containerRef.current;
    if (!track) return null;

    const rect = track.getBoundingClientRect();
    const trackTop = rect.top + window.scrollY;
    const start = trackTop - SCROLL_TRACK_TOP_OFFSET_PX;
    const range = rect.height - window.innerHeight + SCROLL_TRACK_TOP_OFFSET_PX;
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    return Math.max(0, Math.min(start + progress * range, maxScroll));
  }, []);

  // Start every fresh visit to the homepage with a clean click count/URL,
  // in case the provider carried a stale count over from a previous visit.
  useEffect(() => {
    resetClicks();

    // The current state, not null. Next stores its router tree on the history
    // entry (`__NA` + `__PRIVATE_NEXTJS_INTERNALS_TREE`), and its popstate
    // handler bails out entirely on an entry whose state is null - Back
    // changes the URL and re-renders nothing. Next patches
    // history.replaceState to carry those keys forward, but it installs that
    // patch in the AppRouter's own effect, and child effects run before
    // parent ones - so this call, on mount, gets the native replaceState and
    // really would destroy them.
    window.history.replaceState(window.history.state, '', '/');

    // The hero is a scripted intro that plays from the top, so the browser
    // restoring a previous scroll offset would drop the visitor at the end of
    // an animation they never saw. Opt out while this page is mounted, and
    // hand the setting back on the way out so the rest of the site keeps
    // normal back/forward restoration.
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, [resetClicks]);

  // Reflect the click count in the URL, then head to /ocean once the user
  // has clicked the home icon enough times.
  useEffect(() => {
    if (clickCount === 0) return;

    window.history.replaceState(null, '', `/?clicks=${clickCount}`);

    if (clickCount >= CLICKS_TO_OCEAN) {
      const timeout = setTimeout(() => {
        router.push('/ocean');
      }, OCEAN_REDIRECT_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [clickCount, router]);

  // Track scroll progress specifically for this container
  // "start 40px": when top of container hits 40px down the top of viewport (used so the scroll animation triggers immediately)
  // "end end": when bottom of container hits bottom of viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 40px', 'end end'],
  });

  // --- ANIMATION MAPPING ---

  // Phase 1 (0% - 30%): Text moves Left (desktop moves more) & Glass Border appears
  const xPosition = useTransform(
    scrollYProgress,
    [0, 0.3],
    ['0%', isDesktop ? '-15vw' : '0%'],
  );
  const glassOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  // Phase 2 (30% - 60%): Description fades in & Card expands
  // Simulate "expansion" by animating height and width
  const descriptionOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
  // Mobile gets a taller final height than desktop: its card is narrower
  // (see cardWidth below), so the same bio text wraps across more lines and
  // needs more room, or it clips against the card's own overflow-hidden.
  const cardHeight = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5],
    isDesktop ? ['200px', '300px', '450px'] : ['180px', '320px', '560px'],
  );
  // Start narrow (for name), expand to wider (for bio)
  // Desktop: Grows to 550px
  // Mobile: Grows to 90vw (almost full screen width) to prevent overflow
  const cardWidth = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5],
    isDesktop ? ['300px', '400px', '550px'] : ['75vw', '85vw', '90vw'],
  );

  // Phase 3 (30% - 60%): Photo appears
  const photoOpacity = useTransform(
    scrollYProgress,
    [isDesktop ? 0.35 : 0.5, isDesktop ? 0.6 : 0.7],
    [0, 1],
  );
  // Desktop: Slide in from right (100 to 0)
  // Mobile: Keep X at 0 to prevent horizontal scrollbar
  const photoX = useTransform(
    scrollYProgress,
    [isDesktop ? 0.35 : 0.5, isDesktop ? 0.6 : 0.7],
    [isDesktop ? 100 : 0, 0],
  );
  // Mobile: Slide UP from bottom slightly
  // Desktop: No vertical slide needed
  const photoY = useTransform(
    scrollYProgress,
    [isDesktop ? 0.35 : 0.5, isDesktop ? 0.6 : 0.7],
    [isDesktop ? 0 : 50, 0],
  );

  // Fade out the arrow at the end as the user scrolls
  const scrollArrowOpacity = useTransform(
    scrollYProgress,
    [0.6, 0.69, 0.7, 0.99, 1.0],
    [0, 0.8, 1, 1, 0],
  );

  // Move down slightly to stay in page
  const scrollArrowY = useTransform(
    scrollYProgress,
    [0.95, 1.0], // Only start moving in the final 20%
    ['0px', '48px'],
  );

  // --- Auto scroll logic to have the main content appear without requiring the user to scroll themselves ---
  useEffect(() => {
    if (prefersReducedMotion) {
      // Same end state, none of the travel: the hero arrives already revealed
      // rather than being scrolled there over three seconds.
      const frame = requestAnimationFrame(() => {
        const target = getScrollForProgress(AUTO_SCROLL_TARGET_PROGRESS);
        if (target !== null) window.scrollTo(0, target);
      });
      return () => cancelAnimationFrame(frame);
    }

    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    // User Interrupt Logic (The "Emergency Brake"). If the user tries to scroll manually, stop the auto-scroll
    //
    // Attached immediately rather than when the animation starts, and the
    // `cancelled` flag covers the delay window too: someone who scrolls before
    // the intro begins has already said they don't want to be driven, so it
    // should bow out entirely instead of starting up underneath them. Clearing
    // the timeout itself is left to the cleanup below, which keeps
    // `startTimeout` a single-assignment const.
    const stopAutoScroll = () => {
      cancelled = true;
      controls?.stop();
      window.removeEventListener('wheel', stopAutoScroll);
      window.removeEventListener('touchstart', stopAutoScroll);
    };

    window.addEventListener('wheel', stopAutoScroll, { passive: true });
    window.addEventListener('touchstart', stopAutoScroll, { passive: true });

    const startTimeout = setTimeout(() => {
      if (cancelled) return;

      const target = getScrollForProgress(AUTO_SCROLL_TARGET_PROGRESS);
      if (target === null) return;

      // From 0, not from the live scroll position: any manual scroll before
      // now would have cancelled this outright, and the mount effect has
      // already put us at the top for every case that reaches here.
      controls = animate(0, target, {
        duration: AUTO_SCROLL_DURATION_S,
        ease: 'easeInOut',
        onUpdate: (value) => {
          // Whole pixels - `animate` emits floats, and a fractional scrollY
          // makes sub-pixel rounding land differently frame to frame for
          // anything positioned off the scroll offset. At ~4px of travel per
          // frame this costs nothing in smoothness.
          window.scrollTo(0, Math.round(value));
        },
        onComplete: stopAutoScroll,
      });
    }, AUTO_SCROLL_START_DELAY_MS);

    // This cleanup used to be returned from inside the setTimeout callback,
    // where React never saw it - the listeners and a running animation
    // outlived the component.
    return () => {
      clearTimeout(startTimeout);
      stopAutoScroll();
    };
  }, [getScrollForProgress, prefersReducedMotion]);

  return (
    <div className='bg-background min-h-screen w-full font-(family-name:--font-geist-sans)'>
      <HomeIconPopOverlay triggerId={lastClickId} />
      <main className='relative z-10 flex w-full flex-col'>
        {/* SCROLL TRACK: Scrolling this drives the animations.
        The intro page, with a welcome message */}
        <section ref={containerRef} className='relative h-[200vh] w-full'>
          {/* STICKY VIEWPORT: This stays fixed while we scroll through the 200vh track. 
             We hide overflow to ensure elements sliding in don't cause scrollbars.
             top-0 was changed to top-10 to help the scroll animation trigger immediately
          */}
          <div className='sticky top-10 flex h-dvh w-full flex-col items-center overflow-hidden p-4'>
            {/* Container for ocean background at top of page */}
            <div className='absolute inset-0 z-0 -translate-y-6'>
              {/* <ElectricShockBackground /> */}
              <OceanScene />
            </div>

            {/* gradient to blend into page below */}
            <div className='from-background pointer-events-none absolute bottom-0 left-0 z-50 h-32 w-full bg-gradient-to-t to-transparent' />

            {/* CONTENT CONTAINER
                mt-12 on mobile (vs. mt-20 previously) reclaims vertical room
                for the taller mobile card height above, so it fits within
                the viewport instead of running off the bottom. */}
            <div className='pointer-events-none relative z-10 mt-12 flex w-full max-w-7xl flex-col items-center lg:mt-30'>
              {/* Liquid glass card that starts invisible and appears as the text inside moves left on page. */}
              <LiquidGlassCard
                alpha={glassOpacity}
                // Motion only takes the size over once the breakpoint is known
                // (see `hydrated`). The h-/w- classes below are the same values
                // as the first stop of cardHeight/cardWidth, so the handover is
                // a no-op to look at - keep the two in step if either changes.
                style={{
                  x: xPosition,
                  ...(hydrated ? { height: cardHeight, width: cardWidth } : {}),
                }}
                className='pointer-events-auto z-20 h-[180px] w-[75vw] translate-x-0 lg:h-[200px] lg:w-[300px] lg:-translate-x-16'
                contentClassName='relative row-start-2 flex flex-col py-8 px-4 md:px-8 items-start gap-6 overflow-hidden'
              >
                {/* nowrap because the card's width animates: on narrow phones
                    the content box starts around 240px, which is right on this
                    heading's wrap threshold at text-4xl, so "Kyle" flipped
                    between line one and line two as the width crossed back and
                    forth - reading as a vertical shake for the whole run of the
                    animation. The content div already clips, so on very narrow
                    screens the tail is revealed as the card grows instead. */}
                <h1 className='text-primary-rgb-700 text-4xl font-bold tracking-wide whitespace-nowrap'>
                  Hey! I&apos;m Kyle
                </h1>
                <GlitchTextCycle
                  words={HERO_GLITCH_WORDS}
                  className='text-primary-rgb-600'
                />

                {/* Bio Block (Fades in later) */}
                <motion.div
                  style={{ opacity: descriptionOpacity }}
                  className='text-foreground/80 text-lg leading-relaxed'
                >
                  <p>
                    I genuinely care about building robust, maintainable systems
                    that never surprise you. I love experimenting with new
                    technology and will always say &ldquo;yes&rdquo; to the
                    craziest ideas.
                  </p>

                  {/* --- Social Prompts --- */}
                  <div className='mt-6 flex flex-wrap items-center gap-4 pt-2 md:mt-8'>
                    {/* GitHub Link - "View my projects" */}
                    <Link
                      href={GitHubLink}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='group cursor-newtab bg-nebula-500/5 border-nebula-600/10 text-nebula-950 hover:bg-nebula-500/10 hover:border-nebula-600/20 dark:bg-nebula-400/10 dark:border-nebula-300/20 dark:text-nebula-50 dark:hover:bg-nebula-400/20 dark:hover:border-nebula-300/40 flex items-center gap-3 rounded-full border px-5 py-2 transition-colors'
                    >
                      <GitHubIcon
                        className='h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100'
                        useThemeForImgSource
                      />
                      <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                        View my projects
                      </span>
                    </Link>

                    {/* LinkedIn Link - "Let's Connect" */}
                    <Link
                      href={LinkedInLink}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='group cursor-newtab bg-nebula-500/5 border-nebula-600/10 text-nebula-950 hover:bg-nebula-500/10 hover:border-nebula-600/20 dark:bg-nebula-400/10 dark:border-nebula-300/20 dark:text-nebula-50 dark:hover:bg-nebula-400/20 dark:hover:border-nebula-300/40 flex items-center gap-3 rounded-full border px-5 py-2 transition-colors'
                    >
                      <LinkedInIcon
                        className='h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100'
                        useThemeForImgSource
                      />
                      <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                        Connect with me
                      </span>
                    </Link>

                    {/* "Get to know me" trigger - shown here below ~1024px,
                        where the photo (and its own copy of this button) is
                        either hidden or too cramped underneath. */}
                    <button
                      type='button'
                      onClick={openVideo}
                      onPointerEnter={primeVideo}
                      onFocus={primeVideo}
                      className={cn(heroVideoTriggerClasses, 'lg:hidden')}
                    >
                      <Play className='h-4 w-4' fill='currentColor' />
                      <span className='text-sm'>Get to know me</span>
                    </button>
                  </div>
                </motion.div>
              </LiquidGlassCard>

              {/* RIGHT SIDE: Photo (Appears later) */}
              {/* Mobile: Relative, centered, margin-top. Desktop: Absolute, right aligned. */}
              <motion.div
                style={{
                  opacity: photoOpacity,
                  x: photoX,
                  y: photoY,
                }}
                className={cn(
                  // No overflow-hidden here (was needed only to clip the
                  // mobile gradient's square corners to this wrapper's
                  // rounded-2xl - that gradient now lives inside the inner
                  // image container instead, which already clips to its own
                  // rounded-xl). Without it, the desktop CTA button below
                  // - positioned outside this box via top-full - was being
                  // clipped away entirely instead of just hidden by lg:flex.
                  'pointer-events-none z-30 block rounded-2xl',
                  // Smallest phones (< ~390px): scaled down
                  'absolute right-2 bottom-1 h-[150px] w-[112px]',
                  // Base (small phones), ~390px and up:: compact badge, bottom-right
                  'min-[390px]:h-[180px] min-[390px]:w-[135px]',
                  // ~450px and up: current mobile size: Absolute Bottom Right, hanging off the edge
                  'min-[450px]:right-2 min-[450px]:-bottom-8 min-[450px]:h-[189px] min-[450px]:w-[238px]',
                  // Medium (Tablet): Larger, slightly different offset
                  'md:right-8 md:bottom-[-20px] md:mt-0 md:h-[220px] md:w-[260px] md:translate-x-0',
                  // Desktop: Absolute, Right Center, Full Size
                  'lg:top-1/2 lg:right-20 lg:bottom-auto lg:mt-0 lg:h-auto lg:w-auto lg:-translate-y-1/2',
                )}
              >
                {/* image with rounding, border, glow, blur, clipping */}
                <div className='border-lush-400/20 bg-lush-700/10 h-full w-full overflow-hidden rounded-2xl border p-2 shadow-[0_0_24px_-8px_rgb(var(--tw-color-lush-500)/0.4)] backdrop-blur-md'>
                  <div className='relative h-full w-full overflow-hidden rounded-xl shadow-2xl lg:h-[400px] lg:w-[300px]'>
                    <Image
                      src='/me/me-and-rocky.jpg'
                      alt='Me and Rocky'
                      fill
                      // Matched to the box actually rendered at each
                      // breakpoint, minus the 16px the wrapper's p-2 takes off
                      // the outer width. The old blanket 170px made phones
                      // fetch the 384w candidate for a box needing ~120 CSS px.
                      sizes='(min-width: 1024px) 300px, (min-width: 768px) 244px, (min-width: 450px) 222px, (min-width: 390px) 120px, 96px'
                      // 90 was indistinguishable from 75 at these sizes and
                      // cost ~47 KiB for the privilege.
                      quality={75}
                      // In the initial viewport (just transparent until the
                      // scroll reveals it), so there's nothing to gain from
                      // lazy-loading it and a visible pop-in to lose.
                      priority
                      className='object-cover object-[center_75%]'
                    />
                  </div>
                  <div className='min-[450px]:from-background absolute bottom-0 left-0 z-10 h-12 w-full min-[450px]:bg-gradient-to-t min-[450px]:to-transparent lg:hidden' />
                </div>

                {/* "Get to know me" trigger - desktop only, sits under the photo. */}
                <button
                  type='button'
                  onClick={openVideo}
                  onPointerEnter={primeVideo}
                  onFocus={primeVideo}
                  className={cn(
                    heroVideoTriggerClasses,
                    'dark:bg-lush-400 dark:text-lush-950 dark:hover:bg-lush-300 pointer-events-auto absolute top-full left-1/2 mt-4 hidden w-max -translate-x-1/2 hover:brightness-105 lg:flex dark:hover:shadow-[0_6px_24px_-2px_rgb(var(--tw-color-lush-400)/0.55)] dark:hover:brightness-100',
                  )}
                >
                  <Play className='h-4 w-4' fill='currentColor' />
                  <span className='text-sm'>Get to know me</span>
                </button>
              </motion.div>
            </div>

            {/* Scroll indicator arrow */}
            <motion.div
              style={{
                opacity: scrollArrowOpacity,
                y: scrollArrowY, // This moves it down 64px based on scroll
              }}
              className='absolute bottom-10 left-1/2 z-40 -translate-x-1/2 lg:bottom-16'
            >
              {/* Handles the bobbing animation loop */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <ChevronDown className='text-primary-rgb-600/80 dark:text-primary-rgb-500/80 h-10 w-10 drop-shadow-[0_0_8px_rgba(var(--tw-color-lush-400),0.6)]' />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Recommendations */}
        <ReferencesSection />

        {/* Experience */}
        {/* <section className='mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center p-10'>
          <h2 className='mb-8 text-3xl font-bold'>EXPERIENCE</h2>
          <div className='h-[500px] w-full rounded-xl border border-black/10 p-6 dark:border-white/10'>
            <p>Co-op</p>
          </div>
        </section> */}

        {/* Projects */}
        {/* <section className='flex min-h-screen w-full flex-col items-end justify-center p-10'>
          <div className='w-1/2'>
            <h2 className='mb-4 text-3xl font-bold'>PROJECTS</h2>
            <p>This?</p>
          </div>
        </section> */}
      </main>

      {videoMounted && (
        <VideoModalShell
          videos={PORTFOLIO_VIDEOS}
          open={videoOpen}
          onOpenChange={setVideoOpen}
        />
      )}
    </div>
  );
}
