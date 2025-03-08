import Image from 'next/image';

export default function Home() {
  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20'>
      <main className='row-start-2 flex flex-col items-center gap-8 sm:items-start'>
        <h1 className='text-primaryRgb-600 text-4xl font-bold tracking-wide'>
          Hey! I&apos;m Kyle
        </h1>

        <div className='flex flex-col items-center gap-4 sm:flex-row'>
          <a
            className='border-lush-200 text-lush-950 hover:bg-lush-400 flex h-10 items-center justify-center gap-2 rounded-full border border-solid px-4 text-sm transition-colors sm:h-12 sm:px-5 sm:text-base'
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
            className='bg-breeze-200 hover:bg-breeze-300 text-breeze-950 border-breeze-700 flex h-10 items-center justify-center rounded-full border border-solid px-4 text-sm transition-colors hover:border-transparent sm:h-12 sm:min-w-44 sm:px-5 sm:text-base'
            href='/contact'
          >
            Contact me
          </a>
        </div>
        <div>
          <h1>Deep dive into my skills and passion and experience</h1>
          <div className='h-[125px]'>Stuff goes here</div>
          <div className='h-[500px]'>lots of info</div>
        </div>
      </main>
    </div>
  );
}
