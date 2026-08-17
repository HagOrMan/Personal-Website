'use client';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';
import { motion, Variants } from 'motion/react';

import { WaveSpray } from '@/components/animated-fun/Wavespray';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

// Same staggered fade/slide entry PageHeader uses, so the 404 lands with the
// same motion language as every other page on the site.
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Mirrors the solid hero CTA on the homepage - this is the only action on the
// page, so it should read as the strongest thing on it.
const homeButtonClasses =
  'group bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_rgb(var(--tw-color-lush-500)/0.5)] hover:bg-primary/95 hover:shadow-[0_4px_28px_-4px_rgb(var(--tw-color-lush-500)/0.7)] dark:bg-lush-400 dark:text-lush-950 dark:hover:bg-lush-300 ring-offset-background focus-visible:ring-ring inline-flex items-center gap-3 rounded-full px-6 py-2.5 font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden active:scale-95';

/**
 * Body of the 404 page: the glass card, the copy, and the way back home.
 *
 * Split out of `app/not-found.tsx` because the entry animation (and the
 * LiquidGlassCard's motion values) need the client, while the route file
 * stays a server component so it can still export metadata.
 */
export const NotFoundContent = () => {
  return (
    <LiquidGlassCard
      className='relative z-10 w-full max-w-3xl'
      contentClassName='px-6 py-10 md:px-12 md:py-12'
    >
      <motion.div
        initial='hidden'
        animate='visible'
        variants={containerVariants}
        className='flex flex-col items-center gap-6 text-center'
      >
        {/* Same ambient wave used as the decoration on the other pages'
            headers - it keeps a page with almost no content from feeling bare.
            Deep nebula trough into a lush crest: every other page pairs purple
            with breeze (Experience, Resume) or stays in the lush/breeze family,
            so purple -> turquoise is this page's own combination. */}
        <motion.div
          variants={itemVariants}
          aria-hidden='true'
          className='size-24 overflow-hidden rounded-2xl md:size-28'
        >
          <WaveSpray
            colorStart='--tw-color-nebula-800'
            colorEnd='--tw-color-lush-400'
          />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className='text-lush-800 dark:text-lush-300 text-xs font-semibold tracking-[0.2em] uppercase'
        >
          404 — Page not found
        </motion.p>

        {/* pb-2 so the descender on the "p" isn't clipped by bg-clip-text. */}
        <motion.h1
          variants={itemVariants}
          className='from-lush-800 via-lush-700 to-breeze-700 dark:from-lush-300 dark:via-lush-400 dark:to-breeze-300 bg-gradient-to-r bg-clip-text pb-2 text-5xl leading-[1.15] font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl'
        >
          Whoopsies!
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className='text-foreground/70 max-w-xl text-lg leading-relaxed'
        >
          Looks like you&apos;ve entered an invalid link. This page does not
          exist, so you might want to return home and keep browsing from there.
        </motion.p>

        <motion.div variants={itemVariants} className='mt-2'>
          <Link href='/' className={homeButtonClasses}>
            <ArrowLeft className='h-4 w-4 transition-transform group-hover:-translate-x-0.5' />
            <span className='text-sm'>Visit homepage</span>
          </Link>
        </motion.div>
      </motion.div>
    </LiquidGlassCard>
  );
};
