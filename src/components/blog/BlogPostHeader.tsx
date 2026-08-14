'use client';

import React from 'react';
import Link from 'next/link';

import { motion, Variants } from 'motion/react';

import GitHubIcon from '@/components/icons/GithubIcon';
import { Chip } from '@/components/ui/Chip';
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
  /** Estimated reading time in minutes. Optional. */
  readTimeMinutes?: number;
  /** Post tags. Optional. */
  tags?: string[];
  /** GitHub URL for the source markdown, when it lives in a public repo. */
  sourceUrl?: string;
  /** Name of that repo, for the link text. Falls back to "GitHub". */
  sourceLabel?: string;
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
  readTimeMinutes,
  tags = [],
  sourceUrl,
  sourceLabel,
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

          {readTimeMinutes && (
            <>
              <span aria-hidden className='text-muted-foreground/40'>
                ·
              </span>
              <span className='text-muted-foreground'>
                {readTimeMinutes} minute read
              </span>
            </>
          )}

          {sourceUrl && (
            <>
              <span aria-hidden className='text-muted-foreground/60'>
                ·
              </span>
              <a
                href={sourceUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors'
              >
                <GitHubIcon
                  className='size-3.5 shrink-0'
                  useThemeForImgSource
                />
                View on {sourceLabel ?? 'GitHub'}
              </a>
            </>
          )}
        </span>

        {tags.length > 0 && (
          <span className='mt-1 flex flex-wrap gap-2'>
            {tags.map((tag) => (
              <Chip key={tag} asChild>
                <Link href={`/blog?tag=${encodeURIComponent(tag)}`}>{tag}</Link>
              </Chip>
            ))}
          </span>
        )}
      </motion.div>
    </motion.header>
  );
};
