'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';

import { VideoExperience } from '@/components/video/VideoExperience';
import { VideoId } from '@/constant/transcripts';
import { usePrefersReducedMotion } from '@/lib/screenUtils';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

export type VideoModalShellProps = {
  videos: PortfolioVideo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which video the experience opens on (e.g. a "Watch" chip for a specific clip). Defaults to the first video. */
  initialVideoId?: VideoId;
};

/**
 * A real modal dialog (Radix Dialog gives us the focus trap, focus-in/
 * focus-return, Escape-to-close, aria-modal, and inert background for
 * free) that renders the shared VideoExperience inside it. Fully
 * controlled (open/onOpenChange) rather than owning a Dialog.Trigger, so
 * callers can place more than one trigger button at different breakpoints
 * (see the home page) without needing two Dialog instances.
 */
export function VideoModalShell({
  videos,
  open,
  onOpenChange,
  initialVideoId,
}: VideoModalShellProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className='fixed inset-0 z-50 bg-black/60'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              />
            </DialogPrimitive.Overlay>

            {/* aria-labelledby is left to Radix's default - it wires itself
                up automatically to the DialogPrimitive.Title rendered inside
                VideoExperience (variant="modal"). */}
            <DialogPrimitive.Content
              asChild
              forceMount
              className='fixed inset-0 z-50 flex items-center justify-center lg:p-6'
            >
              <motion.div
                className='h-full w-full lg:flex lg:h-auto lg:w-auto lg:translate-x-[3%] lg:justify-center'
                initial={{
                  opacity: 0,
                  scale: prefersReducedMotion ? 1 : 0.96,
                }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <VideoExperience
                  videos={videos}
                  variant='modal'
                  onClose={() => onOpenChange(false)}
                  initialVideoId={initialVideoId}
                  autoplayOnMount
                  className='h-full w-full lg:h-auto lg:w-auto'
                />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
