'use client';

import { useState } from 'react';

import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

import { accordionTransition, chevronTransition } from './motion';

/**
 * The detail bullets, collapsed in place. The card grows downward from the
 * button, so expanding an entry never moves what the reader is looking at.
 *
 * The panel is always rendered and only collapsed to `height: 0` - the
 * bullets stay in the DOM so find-in-page and site search still reach them.
 * `details` is typed as plain strings for exactly this reason: with nothing
 * focusable inside, a collapsed panel can't trap the keyboard, so it needs no
 * `inert` (which would take the text back out of find-in-page). Put a link in
 * here one day and that changes.
 */
export function ExpandableDetail({
  id,
  details,
  reduced,
}: {
  /** The experience's slug - namespaces the button/panel id pair. */
  id: string;
  details: string[];
  reduced: boolean;
}) {
  const [open, setOpen] = useState(false);

  const panelId = `${id}-details`;
  const triggerId = `${id}-details-trigger`;

  return (
    <>
      <button
        type='button'
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className='text-primary focus-visible:ring-ring mt-4 inline-flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden'
      >
        {/* Says what happens next, and stays the same two words either way. */}
        {open ? 'Less' : 'More'}
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={chevronTransition(reduced)}
          className='flex'
        >
          <ChevronDown className='size-4' />
        </motion.span>
      </button>

      {/*
        No role="region" on purpose: it would be named from the trigger, and a
        landmark called "More" is noise. aria-expanded + aria-controls is the
        whole disclosure contract.
        overflow-hidden also opens a block formatting context, so the list's
        top margin can't escape the collapsed wrapper and leave a gap.
      */}
      <motion.div
        id={panelId}
        // initial={false} so a card that mounts collapsed doesn't play the
        // collapse on first paint.
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={accordionTransition(reduced)}
        className='overflow-hidden'
      >
        {/* Block layout, not flex: a flex container blockifies its children,
            which drops the list markers. */}
        <ul className='text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed'>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </motion.div>
    </>
  );
}
