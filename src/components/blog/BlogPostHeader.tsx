'use client';

import React from 'react';

import { motion, Variants } from 'motion/react';

import { cn } from '@/lib/utils';

type BlogPostHeaderProps = {
  /** The post title. Required. */
  title: string;
  /** Short supporting copy under the title. Optional. */
  description?: string;
  /** Author credit. */
  author?: string;
  /** Publish date. Accepts a string or Date; unquoted YAML dates parse as Date. */
  date?: string | Date;
  /** Post tags. Optional. */
  tags?: string[];
  /** Extra classes for the outer <header>. */
  className?: string;
};

function formatDate(value: string | Date): string {
  // timeZone 'UTC' keeps the displayed day matching what was authored.
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.04 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Header for a single blog post: title, description, and a meta row
 * (author · date · tags). Purpose-built and self-contained. Owns its
 * own bottom margin so the page doesn't have to.
 */
export const BlogPostHeader = ({
  title,
  description,
  author = 'Kyle Hagerman',
  date,
  tags = [],
  className,
}: BlogPostHeaderProps) => {
  return (
    <motion.header
      initial='hidden'
      animate='visible'
      variants={container}
      className={cn('mb-8 flex flex-col gap-4', className)}
    >
      <motion.h1
        variants={item}
        className='text-foreground text-4xl font-bold tracking-tight md:text-5xl'
      >
        {title}
      </motion.h1>

      {description && (
        <motion.p
          variants={item}
          className='text-foreground/70 max-w-2xl text-lg leading-relaxed'
        >
          {description}
        </motion.p>
      )}

      <motion.div variants={item} className='flex flex-col gap-y-2 text-sm'>
        <span className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <span className='text-muted-foreground'>
            Written by{' '}
            <span className='text-foreground font-medium'>{author}</span>
          </span>

          {date && (
            <>
              <span aria-hidden className='text-muted-foreground/40'>
                ·
              </span>
              <time
                dateTime={new Date(date).toISOString()}
                className='text-muted-foreground'
              >
                {formatDate(date)}
              </time>
            </>
          )}
        </span>

        {tags.length > 0 && (
          <span className='mt-1 flex flex-wrap gap-2'>
            {tags.map((tag) => (
              <span
                key={tag}
                className='bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-xs'
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </motion.div>
    </motion.header>
  );
};
