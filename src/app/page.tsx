'use client';

import { useRef } from 'react';

import { useScroll, useTransform } from 'motion/react';

// import { ElectricShockBackground } from '@/components/ElectricShockBackground';
import { OceanScene } from '@/components/OceanParticles';
import { GlitchTextCycle } from '@/components/text/GlitchTextCycle';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

export default function Home() {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();

  // Map scroll (0px -> 100px) to opacity (0 -> 1)
  // This controls the Glass Background visibility
  const glassOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  // Map scroll (0px -> 100px) to X position (0% -> -30%)
  const xPosition = useTransform(scrollY, [0, 100], ['0%', '-80%']);

  return (
    <div
      ref={containerRef}
      className='bg-background min-h-screen w-full overflow-x-hidden font-(family-name:--font-geist-sans)'
    >
      <main className='relative z-10 flex w-full flex-col'>
        {/* The intro page, with a welcome message */}
        <section className='relative flex h-screen w-full flex-col items-center p-4'>
          {/* Container for ocean background at top of page */}
          <div className='absolute inset-0 z-0 -translate-y-6'>
            {/* <ElectricShockBackground /> */}
            <OceanScene />
            {/* gradient to blend into page below */}
            <div className='from-background absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t to-transparent' />
          </div>

          {/* Liquid glass card that starts invisible and appears as the text inside moves left on page. */}
          <div className='pointer-events-none relative z-10 mt-30 flex flex-col items-center gap-8'></div>
          <LiquidGlassCard
            alpha={glassOpacity}
            style={{ x: xPosition }}
            className='pointer-events-auto -translate-x-16'
            contentClassName='relative row-start-2 flex flex-col items-start gap-8'
          >
            <h1 className='text-primary-rgb-700 text-4xl font-bold tracking-wide'>
              Hey! I&apos;m Kyle
            </h1>
            <GlitchTextCycle
              words={['Developer', 'Innovator', 'Creator']}
              className='text-primary-rgb-600'
            />
          </LiquidGlassCard>
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
