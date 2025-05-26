import Image from 'next/image';

export default function Home() {
  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 bg-background p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20'>
      <main className='row-start-2 flex flex-col items-center gap-8 sm:items-start'>
        <h1 className='text-4xl font-bold tracking-wide text-primaryRgb-700'>
          Hey! I&apos;m Kyle
        </h1>

        <div className='flex flex-col items-center gap-4 sm:flex-row'>
          <a
            className='flex h-10 items-center justify-center gap-2 rounded-full border border-solid border-lush-200 px-4 text-sm text-foreground transition-colors hover:bg-lush-400 hover:text-accent-foreground active:bg-lush-500 sm:h-12 sm:px-5 sm:text-base'
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
            className='flex h-10 items-center justify-center rounded-full border border-solid border-breeze-700 bg-breeze-200 px-4 text-sm text-breeze-950 transition-colors hover:bg-breeze-300 active:bg-breeze-400 active:outline active:outline-2 active:outline-offset-2 active:outline-breeze-600 sm:h-12 sm:min-w-44 sm:px-5 sm:text-base'
            href='/contact'
          >
            Contact me
          </a>
        </div>
        <a
          className='flex h-10 items-center justify-center rounded-full border border-solid border-nebula-700 bg-nebula-200 px-4 text-sm text-nebula-950 transition-colors hover:bg-nebula-300 active:bg-nebula-400 active:outline active:outline-2 active:outline-offset-2 active:outline-nebula-600 sm:h-12 sm:min-w-44 sm:px-5 sm:text-base'
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
