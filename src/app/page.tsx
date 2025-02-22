import Image from 'next/image';

export default function Home() {
  return (
    <div className='grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20'>
      <main className='row-start-2 flex flex-col items-center gap-8 sm:items-start'>
        <h1 className='text-primary-600 text-4xl font-bold tracking-wide'>
          Hey! I&apos;m Kyle
        </h1>

        <div className='flex flex-col items-center gap-4 sm:flex-row'>
          <a
            className='flex h-10 items-center justify-center gap-2 rounded-full border border-solid border-transparent bg-foreground px-4 text-sm text-background transition-colors hover:bg-[#383838] sm:h-12 sm:px-5 sm:text-base dark:hover:bg-[#ccc]'
            href='/projects'
            target='_blank'
            rel='noopener noreferrer'
          >
            <Image
              className='dark:invert'
              src='/svg/vercel.svg'
              alt='Vercel logomark'
              width={20}
              height={20}
            />
            Check out my projects
          </a>
          <a
            className='flex h-10 items-center justify-center rounded-full border border-solid border-black/[.08] px-4 text-sm transition-colors hover:border-transparent hover:bg-[#f2f2f2] sm:h-12 sm:min-w-44 sm:px-5 sm:text-base dark:border-white/[.145] dark:hover:bg-[#42ffd9]'
            href='/contact'
            target='_blank'
            rel='noopener noreferrer'
          >
            Contact me
          </a>
        </div>
      </main>
    </div>
  );
}
