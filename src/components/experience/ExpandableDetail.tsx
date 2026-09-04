'use client';

import { type ReactNode, useState } from 'react';

import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

import { accordionTransition, chevronTransition } from './motion';

/**
 * The card's one band of interactivity: the More/Less trigger, and whatever
 * `action` holds beside it.
 *
 * `min-h-8` is pinned here rather than left to whatever the row happens to
 * contain, for two reasons: it gives the bare text trigger a proper touch
 * target on a phone, and it keeps every card's row the same height whether or
 * not that entry has a link, or bullets - which is what stops the desktop
 * photo's centring drifting from card to card (see PHOTO_ANCHOR_CLASS in
 * ./motion).
 *
 * Wrapping is the safety net, not the plan: the pair fits on one line down to
 * roughly a 320px viewport. `justify-between` needs no special case for a row
 * holding only one of the two - a lone trigger or a lone action sits left,
 * where it would have been anyway.
 */
const ACTION_ROW_CLASS =
  'flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2';

/**
 * The card's action row, and - for the entries that have bullets - the
 * disclosure those bullets live in. The card grows downward from the button,
 * so expanding an entry never moves what the reader is looking at.
 *
 * `details` is optional because not every entry has bullets worth hiding
 * behind a button; those cards render the row with whatever `action` holds
 * and no trigger, rather than a More button that opens onto nothing. The
 * caller decides whether a row is worth having at all - see TimelineEntry.
 *
 * Renders flush at the top: the card is a flex column with its own gap, and
 * this sits in a cell of it, so a margin here would stack on top of that gap.
 *
 * The panel is always rendered and only collapsed to `height: 0` - the
 * bullets stay in the DOM so find-in-page and site search still reach them.
 * `details` is typed as plain strings for exactly this reason: with nothing
 * focusable inside, a collapsed panel can't trap the keyboard, so it needs no
 * `inert` (which would take the text back out of find-in-page). Put a link in
 * here one day and that changes. Note that `action` below is explicitly *not*
 * that: it shares the trigger's row, outside the collapsible panel, and so is
 * reachable whether the card is open or shut.
 */
export function ExpandableDetail({
  id,
  details,
  reduced,
  action,
}: {
  /** The experience's slug - namespaces the button/panel id pair. */
  id: string;
  details?: string[];
  reduced: boolean;
  /**
   * A second control for the card's action row - the LinkedIn post link,
   * today. It shares the trigger's row rather than claiming one of its own so
   * a card keeps exactly one band of interactivity at its foot, and so the
   * row's height doesn't depend on whether an entry happens to have a link.
   */
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const panelId = `${id}-details`;
  const triggerId = `${id}-details-trigger`;

  // Nothing to disclose, so the row is whatever `action` holds and there's no
  // trigger to sit beside it. Deliberately still the row: an entry with a
  // LinkedIn link and no bullets should hold the same band, at the same
  // height, as one with both.
  //
  // Spelled out as the condition rather than through a `hasDetails` flag so
  // the narrowing carries to the panel below, where `details` is mapped.
  if (details === undefined || details.length === 0) {
    return <div className={ACTION_ROW_CLASS}>{action}</div>;
  }

  return (
    <>
      <div className={ACTION_ROW_CLASS}>
        <button
          type='button'
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          className={cn(
            'focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
            // The rail's blue rather than the site's turquoise primary, so the
            // one interactive thing on a card belongs to the same palette as
            // the timeline it sits against. Two shades because breeze-400 is a
            // bright sky blue - it reads well on the dark card and washes out
            // on the light one, so light mode takes the deeper step.
            //
            // It also keeps the only colour in the row: whatever sits in
            // `action` starts muted, so the primary action stays the one the
            // eye lands on first.
            'text-breeze-700 hover:text-breeze-800 dark:text-breeze-400 dark:hover:text-breeze-300',
            'transition-colors motion-reduce:transition-none',
          )}
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

        {action}
      </div>

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
