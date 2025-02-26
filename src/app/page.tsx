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
            className='flex h-10 items-center justify-center gap-2 rounded-full border border-solid border-transparent bg-foreground px-4 text-sm text-background transition-colors hover:bg-[#b6b6b6] sm:h-12 sm:px-5 sm:text-base'
            href='/projects'
          >
            <Image
              className='invert'
              src='/svg/vercel.svg'
              alt='Vercel logomark'
              width={20}
              height={20}
            />
            Check out my projects
          </a>
          <a
            className='bg-primaryRgb-300 hover:bg-primaryRgb-500 flex h-10 items-center justify-center rounded-full border border-solid border-black/[.08] px-4 text-sm transition-colors hover:border-transparent sm:h-12 sm:min-w-44 sm:px-5 sm:text-base'
            href='/contact'
          >
            Contact me
          </a>
        </div>
        <div>
          <h1>Deep dive into my skills and passion and experience</h1>
          <div className='h-[125px]'>Stuff goes here</div>
        </div>
      </main>
    </div>
  );
}
