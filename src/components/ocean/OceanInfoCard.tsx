'use client';

import { useEffect, useState } from 'react';

import { Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';
import { cn } from '@/lib/utils';

// How long the glass surface itself takes to resize/reposition.
const BOX_TRANSITION_DURATION = 0.5;
// Content waits until the box is basically done moving before it fades in,
// so it never appears mid-resize (which looked like it was "already there"
// on open, and popped in off-center on close).
const CONTENT_REVEAL_DELAY = 0.3;
// How long the open content takes to fade out before the box itself starts
// shrinking. `overflow-hidden` clips to the box's *true* layout size, which
// flips to the small circle the instant `isOpen` goes false (Motion only
// fakes the old, larger look via a transform) — so corner-adjacent content
// like the close button must be fully invisible first, or the tiny circle's
// clip momentarily reveals fragments of it, magnified by that transform.
const CONTENT_EXIT_DURATION = 0.15;

// Corner radius for the two shapes the surface morphs between: a perfect
// circle while closed (matching the icon button) and `rounded-3xl` (1.5rem)
// while open. Driven through the `style` prop rather than a Tailwind class
// swap so Motion's layout animation can tween between them — a className
// change snaps instantly instead of animating, which is invisible on open
// (a circle and a 24px radius look identical at 48px) but reads as a sudden
// oval on close, when the box is still large.
const CLOSED_RADIUS = 9999;
const OPEN_RADIUS = 24;

/**
 * A liquid-glass info button fixed in the top-right corner of the ocean page.
 * Clicking it grows the same glass surface, in place, into a card centered
 * on screen with background on why this page exists.
 *
 * This stays a single element that toggles classes, animated by Motion's
 * `layout` prop, rather than two separately-mounted instances stitched
 * together with a shared `layoutId` — the latter looked choppy on close
 * because it raced an AnimatePresence exit-fade against the layout morph.
 */
export function OceanInfoCard() {
  const [isOpen, setIsOpen] = useState(false);
  // True for the brief window where content is fading out but the box is
  // still in its large, open shape — see CONTENT_EXIT_DURATION above.
  const [isClosing, setIsClosing] = useState(false);
  const showContent = isOpen && !isClosing;

  const requestClose = () => setIsClosing(true);

  // Fires the instant the fade-out finishes (not an estimated duration —
  // guessing left a gap where AnimatePresence had already removed the
  // content but the box was still classed as "open"/h-fit, so it briefly
  // collapsed to fit nothing before the shrink even started, which is what
  // actually produced the squished shape). Only the box itself shrinks now.
  const handleExitComplete = () => {
    if (!isClosing) return;
    setIsOpen(false);
    setIsClosing(false);
  };

  // Let Escape close the card, same as clicking the backdrop or the X button.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Barely-there click-catcher so the waves stay visible behind the card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key='ocean-info-backdrop'
            className='fixed inset-0 z-40 bg-black/10'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={requestClose}
          />
        )}
      </AnimatePresence>

      <LiquidGlassCard
        layout
        transition={{
          layout: { duration: BOX_TRANSITION_DURATION, ease: 'easeInOut' },
        }}
        whileHover={!isOpen ? { scale: 1.05 } : undefined}
        intensity='lg'
        role={isOpen ? 'dialog' : 'button'}
        aria-modal={isOpen}
        aria-label='About this page'
        tabIndex={isOpen ? -1 : 0}
        onClick={() => {
          if (!isOpen) setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (!isOpen && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={cn(
          'fixed z-50',
          isOpen
            ? 'inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-md cursor-default'
            : 'top-20 right-6 h-12 w-12 cursor-pointer',
        )}
        style={{ borderRadius: isOpen ? OPEN_RADIUS : CLOSED_RADIUS }}
        contentClassName='relative h-full w-full p-0'
      >
        <AnimatePresence
          initial={false}
          mode='sync'
          onExitComplete={handleExitComplete}
        >
          {showContent ? (
            <motion.div
              key='content'
              className='flex flex-col gap-4 p-6'
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: CONTENT_REVEAL_DELAY, duration: 0.25 },
              }}
              exit={{
                opacity: 0,
                transition: { duration: CONTENT_EXIT_DURATION },
              }}
            >
              <button
                type='button'
                onClick={requestClose}
                aria-label='Close'
                className='dark:text-foreground/60 hover:text-foreground absolute top-2 right-2 cursor-pointer rounded-full p-1 text-white/60 drop-shadow-sm transition-colors'
              >
                <X className='h-5 w-5' />
              </button>

              <h2 className='dark:text-foreground pr-6 text-xl font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]'>
                Why this page exists
              </h2>
              <p className='dark:text-foreground/80 pb-4 text-sm leading-relaxed text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]'>
                I took an early morning walk to the water one day and was amazed
                at the view. The waves rolling towards me. The blending of
                colours from the sunrise to the water. The way the lake had a
                darkness to it that blended into the sky, with orange from the
                sunrise cutting through them with faint clouds behind. Looking
                at it made me want to recreate it for myself, letting others
                view that beautiful scene.
              </p>

              <p className='dark:text-foreground/80 text-sm leading-relaxed text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]'>
                Though nothing can come close to the real thing, I hope this
                gives a glimpse into the things in life that bring me joy.
              </p>
            </motion.div>
          ) : isOpen ? null : (
            <motion.div
              key='icon'
              className='flex h-full w-full items-center justify-center'
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: CONTENT_REVEAL_DELAY, duration: 0.25 },
              }}
              exit={{
                opacity: 0,
                transition: { duration: CONTENT_EXIT_DURATION },
              }}
            >
              <Info className='text-foreground/80 h-5 w-5' />
            </motion.div>
          )}
        </AnimatePresence>
      </LiquidGlassCard>
    </>
  );
}
