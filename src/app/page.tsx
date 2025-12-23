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
      className='bg-background grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-(family-name:--font-geist-sans) sm:p-20'
    >
      {/* Container for ocean background at top of page */}
      <div className='absolute top-0 left-0 h-screen w-full'>
        {/* <ElectricShockBackground /> */}
        <OceanScene />
        {/* gradient to blend into page below */}
        <div className='from-background absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t to-transparent' />
      </div>

      {/* Main content, centered on page */}
      <main className='relative z-10 row-start-2 flex flex-col items-center gap-8 sm:items-start'>
        {/* Liquid glass card that starts invisible and appears as the text inside moves left on page. */}
        <LiquidGlassCard
          alpha={glassOpacity}
          style={{ x: xPosition }}
          className='-translate-x-8 -translate-y-8'
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

        <div className='relative mt-10'>
          <h1 className='hidden'>
            Deep dive into my skills and passion and experience
          </h1>
          <div className='h-[500px]'>lots of info</div>
        </div>
      </main>
    </div>
  );
}
