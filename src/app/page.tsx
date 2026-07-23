'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { ChevronDown, Play } from 'lucide-react';
import { animate, motion, useScroll, useTransform } from 'motion/react';

// import { ElectricShockBackground } from '@/components/backgrounds/ElectricShockBackground';
import { OceanScene } from '@/components/backgrounds/OceanParticles';
import { HomeIconPopOverlay } from '@/components/home/HomeIconPopOverlay';
import GitHubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { GlitchTextCycle } from '@/components/text/GlitchTextCycle';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { VideoModalShell } from '@/components/video/VideoModalShell';
import { GitHubLink, LinkedInLink } from '@/constant/socials';
import { PORTFOLIO_VIDEOS } from '@/constant/videos';
import { useHomeIconClick } from '@/context/HomeIconClickContext';
import { useMediaQuery } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';

const heroVideoTriggerClasses =
  'group cursor-pointer bg-lush-500/10 border-lush-600/20 text-lush-950 hover:bg-lush-500/20 hover:border-lush-600/30 dark:bg-lush-400/10 dark:border-lush-300/20 dark:text-lush-50 dark:hover:bg-lush-400/20 dark:hover:border-lush-300/40 flex items-center gap-3 rounded-full border px-5 py-2 transition-colors';

// Number of navbar-logo clicks (see HomeIconClickContext) before we take the
// user to /ocean — they clicked the "ocean icon" enough times to go there.
const CLICKS_TO_OCEAN = 3;
// Give the final pop animation time to play before navigating away.
const OCEAN_REDIRECT_DELAY_MS = 900;

export default function Home() {
  const containerRef = useRef(null);
  const router = useRouter();
  const { clickCount, lastClickId, resetClicks } = useHomeIconClick();
  const [videoOpen, setVideoOpen] = useState(false);

  // Check if screen is Large (Desktop)
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Start every fresh visit to the homepage with a clean click count/URL,
  // in case the provider carried a stale count over from a previous visit.
  useEffect(() => {
    resetClicks();
    window.history.replaceState(null, '', '/');
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
    // Wait 2 seconds before starting
    const startTimeout = setTimeout(() => {
      // Calculate how far to scroll.
      // The container is 200vh. The animations finish around 60% (0.6) progress.
      // 60% of the scrollable area (which is roughly 100vh) is ~0.6 * window height.
      // Add a little buffer to ensure everything is fully visible.
      const targetY = window.innerHeight * 0.75;

      // Animate the scroll
      const controls = animate(0, targetY, {
        duration: 3, // Slow scroll (3 seconds)
        ease: 'easeInOut',
        onUpdate: (value) => {
          window.scrollTo(0, value);
        },
      });

      // User Interrupt Logic (The "Emergency Brake"). If the user tries to scroll manually, stop the auto-scroll
      const handleUserInteraction = () => {
        controls.stop();
        window.removeEventListener('wheel', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
      };

      window.addEventListener('wheel', handleUserInteraction, {
        passive: true,
      });
      window.addEventListener('touchstart', handleUserInteraction, {
        passive: true,
      });

      // Cleanup function to remove listeners if component unmounts
      return () => {
        controls.stop();
        window.removeEventListener('wheel', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
      };
    }, 2000);

    return () => clearTimeout(startTimeout);
  }, []);

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
                style={{ x: xPosition, height: cardHeight, width: cardWidth }}
                className='pointer-events-auto z-20 translate-x-0 lg:-translate-x-16'
                contentClassName='relative row-start-2 flex flex-col py-8 px-4 md:px-8 items-start gap-6 overflow-hidden'
              >
                <h1 className='text-primary-rgb-700 text-4xl font-bold tracking-wide'>
                  Hey! I&apos;m Kyle
                </h1>
                <GlitchTextCycle
                  words={['Developer', 'Innovator', 'Creator']}
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

                    {/* "Hear it from me" trigger - shown here below ~1024px,
                        where the photo (and its own copy of this button) is
                        either hidden or too cramped underneath. */}
                    <button
                      type='button'
                      onClick={() => setVideoOpen(true)}
                      className={cn(heroVideoTriggerClasses, 'lg:hidden')}
                    >
                      <Play
                        className='h-4 w-4 opacity-80 transition-opacity group-hover:opacity-100'
                        fill='currentColor'
                      />
                      <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                        Hear it from me
                      </span>
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
                  'border-lush-400/20 bg-lush-700/10 pointer-events-none z-30 block overflow-hidden rounded-2xl border p-2 shadow-[0_0_24px_-8px_rgb(var(--tw-color-lush-500)/0.4)] backdrop-blur-md',
                  // Smallest phones (< ~390px): scaled down
                  'absolute right-2 bottom-0 h-[150px] w-[112px]',
                  // Base (small phones), ~390px and up:: compact badge, bottom-right
                  'min-[390px]:h-[180px] min-[390px]:w-[135px]',
                  // ~450px and up: current mobile size: Absolute Bottom Right, hanging off the edge
                  'min-[450px]:right-2 min-[450px]:-bottom-8 min-[450px]:h-[135px] min-[450px]:w-[170px]',
                  // Medium (Tablet): Larger, slightly different offset
                  'md:right-8 md:bottom-[-20px] md:mt-0 md:h-[220px] md:w-[260px] md:translate-x-0',
                  // Desktop: Absolute, Right Center, Full Size
                  'lg:top-1/2 lg:right-20 lg:bottom-auto lg:mt-0 lg:h-auto lg:w-auto lg:-translate-y-1/2',
                )}
              >
                {/* Replace with your actual Image component */}
                <div className='relative h-full w-full overflow-hidden rounded-xl shadow-2xl lg:h-[400px] lg:w-[300px]'>
                  <Image
                    src='/me/me-and-rocky.jpg'
                    alt='Me and Rocky'
                    fill
                    // priority
                    sizes='(min-width: 1024px) 300px, (min-width: 768px) 260px, 170px'
                    quality={90}
                    className='object-cover object-[center_75%]'
                  />
                </div>
                <div className='from-background absolute bottom-0 left-0 z-10 h-12 w-full bg-gradient-to-t to-transparent lg:hidden' />

                {/* "Hear it from me" trigger - desktop only, sits under the photo. */}
                <button
                  type='button'
                  onClick={() => setVideoOpen(true)}
                  className={cn(
                    heroVideoTriggerClasses,
                    'pointer-events-auto absolute top-full left-1/2 mt-4 hidden w-max -translate-x-1/2 lg:flex',
                  )}
                >
                  <Play
                    className='h-4 w-4 opacity-80 transition-opacity group-hover:opacity-100'
                    fill='currentColor'
                  />
                  <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                    Hear it from me
                  </span>
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

      <VideoModalShell
        videos={PORTFOLIO_VIDEOS}
        open={videoOpen}
        onOpenChange={setVideoOpen}
      />
    </div>
  );
}
