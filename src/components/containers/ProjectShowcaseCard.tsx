'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';

import {
  ACCENT_VARS,
  type AccentKey,
  getAccent,
} from '@/lib/projects/accents';
import { projectHref } from '@/lib/projects/paths';
import { cn } from '@/lib/utils';
import { TProjectShowcaseCard } from '@/types/projects/ProjectShowcase';

import { Skeleton } from '../ui/Skeleton';

interface ProjectShowcaseCardProps extends TProjectShowcaseCard {
  /**
   * 'unified'    — every card uses lush for the border, but the cursor glow
   *                rotates per the shuffled sequence.
   * 'alternating' — both the border AND glow rotate together per the sequence.
   */
  variant?: 'unified' | 'alternating';
}

export const ProjectShowcaseCard = ({
  project,
  index,
  className,
  variant = 'alternating',
}: ProjectShowcaseCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // -------- Color selection -------- //
  const glowAccent = getAccent(index);
  const borderAccent: AccentKey = variant === 'unified' ? 'lush' : glowAccent;

  const borderColor = ACCENT_VARS[borderAccent].border;
  const glowColor = ACCENT_VARS[glowAccent].glow;

  // -------- Mouse-tracked glow -------- //
  // Raw mouse position relative to the card, smoothed by a spring so the
  // glow trails the cursor like light through water rather than snapping.
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 20 });

  const glowX = useTransform(smoothX, (v) => `${v * 100}%`);
  const glowY = useTransform(smoothY, (v) => `${v * 100}%`);

  // Glow strength — bumps on hover, falls off gracefully on leave.
  const glowStrength = useMotionValue(0);
  const smoothStrength = useSpring(glowStrength, {
    stiffness: 90,
    damping: 22,
  });
  const glowOpacity = useTransform(smoothStrength, (v) => 0.45 * v);
  const glowMixPct = useTransform(smoothStrength, (v) => 35 * v);
  const topEdgeOpacity = useTransform(smoothStrength, (v) => 0.3 + 0.5 * v);

  const cursorGlow = useMotionTemplate`radial-gradient(
    circle at ${glowX} ${glowY},
    color-mix(in srgb, ${glowColor} ${glowMixPct}%, transparent),
    transparent 60%
  )`;

  // Static border-tinted ambient glow — the card's "color identity."
  const ambientGlow = `0 0 0 1px color-mix(in srgb, ${borderColor} 30%, transparent),
                      0 8px 24px -8px color-mix(in srgb, ${glowColor} 25%, transparent)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => glowStrength.set(1);
  const handleMouseLeave = () => glowStrength.set(0);

  return (
    <motion.div
      ref={cardRef}
      id={`${index}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // Entry animation: rise + fade, staggered by index.
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderColor,
        boxShadow: ambientGlow,
      }}
      className={cn(
        // Sized by the grid track, not by the card — see AnimatedProjectGrid.
        'group relative flex h-full w-full flex-col overflow-hidden rounded-xl border',
        'transition-shadow duration-300',
        'hover:shadow-lg',
        'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2',
        className,
      )}
    >
      {/* Cursor-tracked glow. pointer-events-none so it never eats clicks. */}
      <motion.div
        aria-hidden
        className='pointer-events-none absolute inset-0 z-20 mix-blend-multiply dark:mix-blend-screen'
        style={{
          background: cursorGlow,
          opacity: glowOpacity,
        }}
      />

      {/* Top edge specular highlight — brightens on hover. */}
      <motion.div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 top-0 z-20 h-px'
        style={{
          background: `linear-gradient(to right, transparent, ${glowColor}, transparent)`,
          opacity: topEdgeOpacity,
        }}
      />

      {/* Image with parallax-lite scale on hover */}
      <div className='bg-muted relative aspect-video w-full overflow-hidden'>
        {project.thumbnail ? (
          <motion.div
            className='absolute inset-0'
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={project.thumbnail}
              alt=''
              fill
              sizes='(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
              // Contain, matching the spotlight variant: a poster that isn't
              // 16:9 letterboxes against bg-muted instead of losing its edges.
              // The hover scale above then eats into the bars first.
              className='object-contain object-center'
            />
          </motion.div>
        ) : (
          <Skeleton className='h-full w-full animate-none rounded-none' />
        )}

        {/* Short fade from image into card surface — tight band at the
            bottom edge for contrast without swallowing the image. */}
        <div
          className='pointer-events-none absolute inset-x-0 bottom-0 h-8'
          style={{
            background:
              'linear-gradient(to top, hsl(var(--card)), transparent)',
          }}
          aria-hidden
        />
      </div>

      {/* Content. Deliberately not `relative`: the name's stretched ::after
          has to resolve against the card, not against this block. It's a flex
          child, so z-10 still applies without positioning. */}
      <div className='z-10 px-4 pt-3 pb-4'>
        <h2 className='text-foreground text-lg font-semibold'>
          {/* Stretched link: the ::after covers the card, so the whole thing
              is one click target named after the project. */}
          <Link
            href={projectHref(project)}
            className='group-hover:text-primary transition-colors after:absolute after:inset-0 after:content-[""] focus-visible:outline-hidden'
          >
            {project.name}
          </Link>
        </h2>
        <span className='text-muted-foreground text-sm'>
          {project.description}
        </span>
      </div>
    </motion.div>
  );
};
