import React, { useEffect } from 'react';

import {
  HTMLMotionProps,
  motion,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from 'motion/react';

import { cn } from '@/lib/utils';

interface LiquidGlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  /**
   * Controls the max intensity of the glass frost effect when alpha is 1.
   * 'sm' = clear water, 'md' = frosted glass, 'lg' = deep ice
   */
  intensity?: 'sm' | 'md' | 'lg';
  /**
   * A value between 0 and 1 that scales the visibility of all glass effects.
   * 0 = completely invisible (no blur, border, or background)
   * 1 = fully visible
   */
  alpha?: number | MotionValue<number>;
  contentClassName?: string;
}

/**
 * A Card which creates a liquid glass effect and holds any child elements inside.
 * Takes opacity to modify the opacity of the liquid glass card, which then uses framer motion, allowing for the card to smoothly fade in and out of view.
 * Colour is fixed and will likely remain that way unless I see need to make it customizeable.
 *
 */
export const LiquidGlassCard = ({
  children,
  className,
  contentClassName,
  intensity = 'md',
  alpha = 1, // fully visible
  style,
  ...props
}: LiquidGlassCardProps) => {
  // Map intensity to pixel values for interpolation
  const blurMap = {
    sm: 4,
    md: 12,
    lg: 24,
  };
  const maxBlur = blurMap[intensity];

  // Normalize alpha to always be a MotionValue
  // If a number is passed, we wrap it. If a MotionValue is passed, we use it.
  const alphaMV = useMotionValue(typeof alpha === 'number' ? alpha : 0);

  // Update the internal MotionValue if the prop is a static number that changes
  useEffect(() => {
    if (typeof alpha === 'number') {
      alphaMV.set(alpha);
    }
  }, [alpha, alphaMV]);

  // Use the passed MotionValue directly if available, otherwise use our internal one
  const activeAlpha = typeof alpha === 'number' ? alphaMV : alpha;

  // Create Transforms for the numeric values needed inside the CSS strings
  const blurPx = useTransform(activeAlpha, (v) => maxBlur * v);
  const lushOpacity = useTransform(activeAlpha, (v) => 15 * v);
  const breezeOpacity = useTransform(activeAlpha, (v) => 10 * v);
  const borderOpacity = useTransform(activeAlpha, (v) => 20 * v);
  const shadowOpacity = useTransform(activeAlpha, (v) => 0.3 * v);
  const highlightOpacity = useTransform(activeAlpha, (v) => 0.08 * v);

  // A minimum opacity floor so the glass never fully disappears
  const minOpacity = useTransform(activeAlpha, (v) => 2 * v);

  // -------- Construct the CSS strings using useMotionTemplate. These update directly on the DOM, bypassing React renders -------- //

  // The "Liquid" Surface
  // We use a gradient from Lush (Teal) to Breeze (Blue) at very low opacity
  // This tints the glass to match the ocean theme.
  const background = useMotionTemplate`linear-gradient(
    to bottom right, 
    color-mix(in srgb, var(--color-lush-500) ${lushOpacity}%, transparent), 
    color-mix(in srgb, var(--color-breeze-500) ${breezeOpacity}%, transparent), 
    color-mix(in srgb, var(--color-breeze-500) ${minOpacity}%, transparent)
  )`;

  // The Border Highlight
  // A very subtle border that fades, mimicking light catching the edge of wet glass
  const borderColor = useMotionTemplate`color-mix(in srgb, var(--color-lush-400) ${borderOpacity}%, transparent)`;

  // Deep shadow to separate the glass from the particle waves behind it
  const boxShadow = useMotionTemplate`0 8px 32px 0 rgba(0,0,0,${shadowOpacity})`;

  // The Frost/Blur Effect. Scale the blur radius so it disappears at alpha 0
  const backdropFilter = useMotionTemplate`blur(${blurPx}px)`;

  // Specular Highlight: from-white/5 to-transparent
  const highlightBg = useMotionTemplate`radial-gradient(
    circle at top left, 
    rgba(255,255,255,${highlightOpacity}), 
    transparent 70%
  )`;

  return (
    <motion.div
      className={cn(
        // Structure & Shape
        'relative overflow-hidden rounded-3xl border border-solid',
        className,
      )}
      style={{
        background,
        borderColor,
        boxShadow,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        ...style,
      }}
      {...props}
    >
      {/* Specular Highlight / Gloss
         This inner div creates a faint white reflection at the top-left,
         making the surface look wet/shiny.
      */}
      <motion.div
        className='pointer-events-none absolute inset-0'
        style={{ background: highlightBg }}
        aria-hidden='true'
      />

      {/* Content Container */}
      <div className={cn('relative z-10 p-8', contentClassName)}>
        {children}
      </div>
    </motion.div>
  );
};
