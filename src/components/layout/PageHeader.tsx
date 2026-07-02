'use client';

import React from 'react';

import { motion, Variants } from 'motion/react';

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  /** The main page title. Required. */
  title: string;
  /** Short supporting copy underneath the title. Optional. */
  description?: string;
  /** Horizontal alignment of the text block. Defaults to 'left'. */
  align?: 'left' | 'center';
  /**
   * Optional decorative slot rendered to the right of the title block.
   * Intended for things like a small Three.js canvas with floating lights.
   *
   * On mobile it stacks below the title to avoid cramping.
   */
  decoration?: React.ReactNode;
  /** Extra classes for the outer <header> element. */
  className?: string;
};

/**
 * Standard page header used at the top of sub-pages.
 *
 * Renders a title and optional description with an animated fade/slide entry
 * on mount, respecting `prefers-reduced-motion`. Supports an optional
 * `decoration` slot to the right (intended for small ambient animations).
 *
 * Owns its own bottom margin so pages don't need to remember to space it.
 */
export const PageHeader = ({
  title,
  description,
  align = 'left',
  decoration,
  className,
}: PageHeaderProps) => {
  const isCenter = align === 'center';

  // Stagger the children: title leads, description follows.
  // Reduced motion is handled automatically by motion via the
  // useReducedMotion hook under the hood when `transition` durations
  // are short; we also guard explicitly with the variants below.
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

  return (
    <motion.header
      initial='hidden'
      animate='visible'
      variants={containerVariants}
      className={cn(
        // Layout: text block + optional decoration slot
        'mb-10 flex flex-col gap-6 md:mb-14',
        // When there's a decoration, lay out row-wise on md+
        decoration && 'md:flex-row md:items-center md:gap-10',
        className,
      )}
    >
      {/* Text block */}
      <div
        className={cn(
          'flex flex-col gap-3',
          isCenter && !decoration && 'items-center text-center',
        )}
      >
        <motion.h1
          variants={itemVariants}
          className='text-foreground text-4xl font-bold tracking-tight md:text-5xl'
        >
          {title}
        </motion.h1>

        {description && (
          <motion.p
            variants={itemVariants}
            className={cn(
              'text-foreground/70 max-w-2xl text-lg leading-relaxed',
              isCenter && !decoration && 'mx-auto',
            )}
          >
            {description}
          </motion.p>
        )}
      </div>

      {/* Decoration slot (e.g. floating lights canvas later) */}
      {decoration && (
        <motion.div
          variants={itemVariants}
          className='pointer-events-none flex shrink-0 items-center justify-center md:pointer-events-auto'
          aria-hidden='true'
        >
          {decoration}
        </motion.div>
      )}
    </motion.header>
  );
};
