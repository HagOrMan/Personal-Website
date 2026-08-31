'use client';

import * as React from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Chip } from '@/components/ui/Chip';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { usePrefersReducedMotion } from '@/lib/screenUtils';
import { type ProjectTag, TAG_META } from '@/types/projects/ProjectShowcase';

/**
 * One ⓘ beside the chip row, opening a modal that defines every tag at once.
 *
 * The descriptions used to hang off each chip individually, which read as
 * clutter — six chips meant six buttons. They're still on the chips
 * themselves as tooltips (hover and keyboard focus both); this is the path
 * for touch, for screen readers, and for anyone who wants to see the whole
 * vocabulary side by side rather than one at a time.
 *
 * Radix Dialog handles the focus trap, focus return, Escape and scroll lock.
 */
export function ProjectTagLegend({ tags }: { tags: ProjectTag[] }) {
  const [open, setOpen] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (tags.length === 0) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogPrimitive.Trigger
            aria-label='What do these filters mean?'
            className='text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
          >
            <Info className='size-4' aria-hidden />
          </DialogPrimitive.Trigger>
        </TooltipTrigger>
        <TooltipContent>What do these filters mean?</TooltipContent>
      </Tooltip>

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

            {/* Content is the centering layer rather than the card itself —
                `asChild` concatenates Radix's className onto the child, so
                styling the card here would leave it stretched over the whole
                screen. Same shape as ReferenceModal, including the
                outside-click check that layer makes necessary. */}
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className='fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6'
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) setOpen(false);
                }}
              >
                <div className='bg-card border-border flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border shadow-2xl'>
                  <div className='border-border flex items-start justify-between gap-4 border-b p-6 pb-4'>
                    <div className='flex flex-col gap-1'>
                      <DialogPrimitive.Title className='text-foreground text-xl font-semibold'>
                        Filter tags
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className='text-muted-foreground text-sm'>
                        Pick more than one and a project has to match them all.
                      </DialogPrimitive.Description>
                    </div>

                    <DialogPrimitive.Close
                      aria-label='Close'
                      className='text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 cursor-pointer rounded-full p-1 focus-visible:ring-2 focus-visible:outline-hidden motion-safe:transition-colors'
                    >
                      <X className='size-5' />
                    </DialogPrimitive.Close>
                  </div>

                  <dl className='scrollbar-hover flex flex-col gap-4 overflow-y-auto px-6 py-5'>
                    {tags.map((tag) => (
                      <div key={tag} className='flex flex-col gap-1.5'>
                        <dt>
                          <Chip>{TAG_META[tag].label}</Chip>
                        </dt>
                        <dd className='text-foreground/80 text-sm leading-relaxed'>
                          {TAG_META[tag].description}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
