'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { pauseAllAudio } from '@/components/music/ExclusiveAudio';
import { actionVariants } from '@/components/ui/actionVariants';
import { usePrefersReducedMotion } from '@/lib/screenUtils';

type CompositionModalProps = {
  title: string;
  subtitle?: string;
  /** The piece's CompositionBody, rendered on the server. */
  children: React.ReactNode;
};

/**
 * /music/[slug] as a dialog over the page it was opened from. Only ever
 * mounted by the intercepting route in app/@modal, so it exists exactly when
 * the URL says it should: a refresh or a shared link gets the full page
 * instead.
 *
 * Open state is the route, so closing means going back. It animates out
 * first and navigates on exit-complete; navigating first would unmount the
 * dialog before the animation could play. The browser's own back button
 * skips the animation and just unmounts it.
 *
 * Radix gives the focus trap, Escape, scroll lock, aria-modal, labelling
 * from the Title, and focus return to the card that opened it.
 */
export function CompositionModal({
  title,
  subtitle,
  children,
}: CompositionModalProps) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(true);

  const close = () => {
    pauseAllAudio();
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <AnimatePresence onExitComplete={() => router.back()}>
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

            {/* Content is the full-viewport centering layer, not the panel -
                same reasoning as ReferenceModal: `asChild` merges Radix's
                className onto the child, and this layer covering the backdrop
                means Radix never sees an outside click, hence the target
                check. No Description: the body is the description, and
                aria-describedby={undefined} tells Radix that's deliberate. */}
            <DialogPrimitive.Content
              asChild
              forceMount
              aria-describedby={undefined}
            >
              <motion.div
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className='fixed inset-0 z-50 flex items-center justify-center md:p-6'
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) close();
                }}
              >
                <div className='bg-background border-border flex h-full w-full flex-col shadow-2xl md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl md:border'>
                  <div className='border-border flex items-start justify-between gap-4 border-b px-6 py-4'>
                    <div className='flex flex-col gap-1'>
                      <DialogPrimitive.Title className='text-foreground text-xl font-semibold md:text-2xl'>
                        {title}
                      </DialogPrimitive.Title>
                      {subtitle && (
                        <p className='text-foreground/70 text-sm'>{subtitle}</p>
                      )}
                    </div>
                    <DialogPrimitive.Close
                      aria-label='Close'
                      className={actionVariants({
                        variant: 'outline',
                        size: 'icon',
                        className: 'cursor-pointer',
                      })}
                    >
                      <X aria-hidden className='size-4' />
                    </DialogPrimitive.Close>
                  </div>

                  <div className='min-h-0 overflow-y-auto overscroll-contain px-6 py-8'>
                    {children}
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
