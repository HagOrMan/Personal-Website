'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { Chip } from '@/components/ui/Chip';
import { LinkedInRecommendationsLink } from '@/constant/socials';
import { usePrefersReducedMotion } from '@/lib/screenUtils';
import { TReference } from '@/types/references';

export type ReferenceModalProps = {
  /** The reference to show, or null when the modal is closed. */
  reference: TReference | null;
  onClose: () => void;
};

type ReferenceBlock =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; items: string[] };

const BULLET_PATTERN = /^[-*•]\s+/;

/**
 * Splits a recommendation into paragraphs and bullet lists, so a run of
 * "- " lines renders as a real <ul> the way it does on LinkedIn.
 *
 * Deliberately not react-markdown: it's only pulled in on the blog route
 * today, so importing it here would add its whole parser to the homepage
 * bundle for one list - and it would apply full markdown semantics to text
 * that isn't markdown, silently eating a stray `*` or `#` as formatting.
 * LinkedIn recommendations are plain text, and this is the only structure
 * they carry.
 *
 * Blank lines close whichever block is open; switching between bullet and
 * non-bullet lines closes it too, which is what lets a lead-in sentence sit
 * directly above its list with no blank line between them (exactly how the
 * source strings are written).
 */
function toBlocks(reference: string): ReferenceBlock[] {
  const blocks: ReferenceBlock[] = [];
  let open: ReferenceBlock | null = null;

  for (const rawLine of reference.split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      open = null;
      continue;
    }

    if (BULLET_PATTERN.test(line)) {
      const item = line.replace(BULLET_PATTERN, '');
      if (open?.kind === 'list') {
        open.items.push(item);
      } else {
        open = { kind: 'list', items: [item] };
        blocks.push(open);
      }
      continue;
    }

    if (open?.kind === 'paragraph') {
      open.lines.push(line);
    } else {
      open = { kind: 'paragraph', lines: [line] };
      blocks.push(open);
    }
  }

  return blocks;
}

/**
 * The full text of a single recommendation, in a real modal dialog.
 *
 * A modal rather than an inline expand-in-place: the full references run
 * several hundred words with bullet lists, which would blow out the card's
 * grid row (and stretch its neighbour into dead whitespace) while shoving
 * the rest of the page down. Here the text gets its own reading measure,
 * independent of how wide the card happened to be.
 *
 * Controlled by the parent (one instance is shared by every card) rather
 * than owning a Dialog.Trigger - same pattern as VideoModalShell. Radix
 * Dialog gives us the focus trap, focus return, Escape-to-close, scroll
 * lock and aria-modal for free.
 */
export function ReferenceModal({ reference, onClose }: ReferenceModalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <DialogPrimitive.Root
      open={reference !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatePresence>
        {reference && (
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

            {/* Content is the full-viewport centering layer, not the card
                itself: `asChild` concatenates Radix's className onto the
                child, so giving Content the card's classes would leave the
                card `fixed inset-0` and stretched over the whole screen.
                Because that layer sits over the backdrop, Radix's own
                outside-click detection never fires - hence the target check. */}
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
                // pointerdown, not click: these are long quotes, and if a
                // drag-select ends out on the backdrop the resulting click's
                // target is this wrapper - closing the modal mid-read.
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) onClose();
                }}
              >
                <div className='bg-card border-border flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border shadow-2xl'>
                  {/* Header: who said it. Stays put while the text scrolls. */}
                  <div className='border-border flex items-start justify-between gap-4 border-b p-6 pb-4'>
                    <div className='flex flex-col items-start gap-1'>
                      <DialogPrimitive.Title className='text-foreground text-xl font-semibold'>
                        {reference.name}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className='text-foreground/75 text-sm'>
                        {reference.title}, {reference.organization}
                      </DialogPrimitive.Description>
                      <Chip className='mt-2 whitespace-normal'>
                        {reference.relationship}
                      </Chip>
                    </div>

                    <DialogPrimitive.Close
                      aria-label='Close'
                      className='text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 cursor-pointer rounded-full p-1 focus-visible:ring-2 focus-visible:outline-hidden motion-safe:transition-colors'
                    >
                      <X className='h-5 w-5' />
                    </DialogPrimitive.Close>
                  </div>

                  <div className='scrollbar-hover overflow-y-auto px-6 py-5'>
                    <blockquote className='text-foreground/90 flex flex-col gap-4 leading-relaxed'>
                      {toBlocks(reference.reference).map((block, i) =>
                        block.kind === 'list' ? (
                          // No flex/grid on the <ul>: that would make each
                          // <li> a flex item, which drops `display: list-item`
                          // and takes the markers with it.
                          <ul
                            key={i}
                            className='marker:text-muted-foreground list-disc space-y-2 pl-5'
                          >
                            {block.items.map((item, itemIndex) => (
                              <li key={itemIndex} className='pl-1'>
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p key={i} className='whitespace-pre-line'>
                            {block.lines.join('\n')}
                          </p>
                        ),
                      )}
                    </blockquote>
                  </div>

                  <div className='border-border border-t px-6 py-4'>
                    <a
                      href={LinkedInRecommendationsLink}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-breeze-900/80 hover:text-breeze-700 dark:text-breeze-300/75 dark:hover:text-breeze-300 cursor-newtab inline-flex items-center gap-2 text-sm motion-safe:transition-colors'
                    >
                      <LinkedInIcon className='h-4 w-4' useThemeForImgSource />
                      View on LinkedIn
                    </a>
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
