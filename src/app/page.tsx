'use client';

import { useRef } from 'react';

import { motion, useScroll, useTransform } from 'motion/react';

// import { ElectricShockBackground } from '@/components/ElectricShockBackground';
import { OceanScene } from '@/components/OceanParticles';
import { GlitchTextCycle } from '@/components/text/GlitchTextCycle';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

export default function Home() {
  const containerRef = useRef(null);

  // Track scroll progress specifically for this container
  // "start 40px": when top of container hits 40px down the top of viewport (used so the scroll animation triggers immediately)
  // "end end": when bottom of container hits bottom of viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 40px', 'end end'],
  });

  // --- ANIMATION MAPPING ---

  // Phase 1 (0% - 30%): Text moves Left & Glass Border appears
  const xPosition = useTransform(scrollYProgress, [0, 0.3], ['0%', '-50%']);
  const glassOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  // Phase 2 (30% - 60%): Description fades in & Card expands
  // Simulate "expansion" by animating height and width
  const descriptionOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
  const cardHeight = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5],
    ['200px', '200px', '450px'],
  );
  // Start narrow (for name), expand to wider (for bio)
  const cardWidth = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5],
    ['300px', '300px', '550px'],
  );

  // Phase 3 (30% - 60%): Photo appears on the right
  const photoOpacity = useTransform(scrollYProgress, [0.35, 0.6], [0, 1]);
  const photoX = useTransform(scrollYProgress, [0.35, 0.6], [100, 0]);

  return (
    <div className='bg-background min-h-screen w-full font-(family-name:--font-geist-sans)'>
      <main className='relative z-10 flex w-full flex-col'>
        {/* SCROLL TRACK: Scrolling this drives the animations.
        The intro page, with a welcome message */}
        <section ref={containerRef} className='relative h-[200vh] w-full'>
          {/* STICKY VIEWPORT: This stays fixed while we scroll through the 200vh track. 
             We hide overflow to ensure elements sliding in don't cause scrollbars.
             top-0 was changed to top-10 to help the scroll animation trigger immediately
          */}
          <div className='sticky top-10 flex h-screen w-full flex-col items-center overflow-hidden p-4'>
            {/* Container for ocean background at top of page */}
            <div className='absolute inset-0 z-0 -translate-y-6'>
              {/* <ElectricShockBackground /> */}
              <OceanScene />
              {/* gradient to blend into page below */}
              <div className='from-background absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t to-transparent' />
            </div>

            {/* CONTENT CONTAINER */}
            <div className='pointer-events-none relative z-10 mt-30 flex w-full max-w-7xl flex-col items-center'>
              {/* Liquid glass card that starts invisible and appears as the text inside moves left on page. */}
              <LiquidGlassCard
                alpha={glassOpacity}
                style={{ x: xPosition, height: cardHeight, width: cardWidth }}
                className='pointer-events-auto -translate-x-16'
                contentClassName='relative row-start-2 flex flex-col items-start gap-8 overflow-hidden'
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
                </motion.div>
              </LiquidGlassCard>

              {/* RIGHT SIDE: Photo (Appears later) */}
              {/* Absolute positioning helps keep it from affecting layout before it appears */}
              <motion.div
                style={{
                  opacity: photoOpacity,
                  x: photoX,
                }}
                className='pointer-events-auto absolute top-1/2 right-20 -translate-y-1/2 rounded-2xl border border-white/10 bg-black/20 p-2 backdrop-blur-md'
              >
                {/* Replace with your actual Image component */}
                <div className='h-[400px] w-[300px] rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-2xl' />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className='mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center p-10'>
          <h2 className='mb-8 text-3xl font-bold'>EXPERIENCE</h2>
          <div className='h-[500px] w-full rounded-xl border border-black/10 p-6 dark:border-white/10'>
            <p>Co-op</p>
          </div>
        </section>

        {/* Projects */}
        <section className='flex min-h-screen w-full flex-col items-end justify-center p-10'>
          <div className='w-1/2'>
            <h2 className='mb-4 text-3xl font-bold'>PROJECTS</h2>
            <p>This?</p>
          </div>
        </section>
      </main>
    </div>
  );
}
