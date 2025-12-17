'use client';

import Image from 'next/image';

// import { ElectricShockBackground } from '@/components/ElectricShockBackground';
import { OceanScene } from '@/components/OceanParticles';
import { GlitchTextCycle } from '@/components/text/GlitchTextCycle';

export default function Home() {
  return (
    <div className='bg-background grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-(family-name:--font-geist-sans) sm:p-20'>
      <div className='absolute top-0 left-0 h-screen w-screen'>
        {/* <ElectricShockBackground /> */}
        <OceanScene />
        {/* gradient to blend into page below */}
        <div className='from-background absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t to-transparent' />
      </div>
      <main className='relative z-10 row-start-2 flex flex-col items-center gap-8 sm:items-start'>
        <h1 className='text-primary-rgb-700 text-4xl font-bold tracking-wide'>
          Hey! I&apos;m Kyle
        </h1>
        <GlitchTextCycle
          words={['Programmer', 'Innovator', 'Developer']}
          className='text-primary-rgb-600'
        />

        <div className='flex flex-col items-center gap-4 sm:flex-row'>
          <a
            className='border-lush-200 text-foreground hover:bg-lush-400 hover:text-accent-foreground active:bg-lush-500 flex h-10 items-center justify-center gap-2 rounded-full border border-solid px-4 text-sm transition-colors sm:h-12 sm:px-5 sm:text-base'
            href='/projects'
          >
            <Image
              className='invert dark:invert-0'
              src='/svg/vercel.svg'
              alt='Vercel logomark'
              width={20}
              height={20}
            />
            Check out my projects
          </a>
          <a
            className='border-breeze-700 bg-breeze-200 text-breeze-950 hover:bg-breeze-300 active:bg-breeze-400 active:outline-breeze-600 flex h-10 items-center justify-center rounded-full border border-solid px-4 text-sm transition-colors active:outline-2 active:outline-offset-2 sm:h-12 sm:min-w-44 sm:px-5 sm:text-base'
            href='/contact'
          >
            Contact me
          </a>
        </div>
        <a
          className='border-nebula-700 bg-nebula-200 text-nebula-950 hover:bg-nebula-300 active:bg-nebula-400 active:outline-nebula-600 flex h-10 items-center justify-center rounded-full border border-solid px-4 text-sm transition-colors active:outline-2 active:outline-offset-2 sm:h-12 sm:min-w-44 sm:px-5 sm:text-base'
          href='/about-me'
        >
          Read about me
        </a>
        <div>
          <h1>Deep dive into my skills and passion and experience</h1>
          <div className='h-[125px]'>Stuff goes here</div>
          <div className='h-[500px]'>lots of info</div>
        </div>
      </main>
    </div>
  );
}
