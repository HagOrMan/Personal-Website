'use client';

import { useRef } from 'react';

import { motion, useInView, useReducedMotion } from 'motion/react';

import { Chip } from '@/components/ui/Chip';
import {
  type Experience,
  formatRange,
  KIND_LABELS,
  PRESENT_LABEL,
} from '@/data/experiences';
import { cn } from '@/lib/utils';

import { ExpandableDetail } from './ExpandableDetail';
import { ExperienceMedia } from './ExperienceMedia';
import {
  CARD_INSET_LEFT_CLASS,
  CARD_INSET_RIGHT_CLASS,
  CONNECTOR_W_CLASS,
  ENTRY_IN_VIEW_AMOUNT,
  entryContainerVariants,
  entryItemVariants,
  NODE_Y_CLASS,
  type TimelineSide,
} from './motion';
import { TimelineNode } from './TimelineRail';

/**
 * One experience: its node on the rail, and the card hanging off it.
 *
 * `side` is a prop rather than something measured at mount, and it only takes
 * effect from `md` up - below that every card sits right of the rail no
 * matter what it was passed. That keeps the layout a single implementation
 * and keeps it correct on the server, before any viewport exists.
 */
export function TimelineEntry({
  experience,
  side,
}: {
  experience: Experience;
  side: TimelineSide;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { amount: ENTRY_IN_VIEW_AMOUNT, once: true });

  // With motion off there's no reveal to wait for, so the entry is simply
  // there - including its node, which would otherwise sit unfilled forever
  // if the observer never fired.
  const revealed = reduced || inView;

  const range = formatRange(experience.start, experience.end);
  const item = entryItemVariants(reduced, side);

  const onRight = side === 'right';
  // Which grid column the text and the media take at `md`. The media always
  // lands on the outer edge - the side away from the rail.
  const textColumn = onRight ? 'md:col-start-1' : 'md:col-start-2';
  const mediaColumn = onRight ? 'md:col-start-2' : 'md:col-start-1';

  return (
    <motion.li
      ref={ref}
      id={experience.id}
      // Never branched on `reduced` - see entryItemVariants. The server can't
      // read the setting, so an initial that depended on it would hydrate as
      // a style mismatch; the reduced path instead lands on `visible` with a
      // zero-length transition, which is instant and invisible either way.
      initial='hidden'
      animate={revealed ? 'visible' : 'hidden'}
      variants={entryContainerVariants}
      className={cn(
        // scroll-mt clears the fixed navbar when someone lands on /experience#slug.
        'relative scroll-mt-24',
        // One entry roughly fills the view, with the next node peeking below.
        // Shorter at md, which is what puts more of the timeline on screen on
        // a desktop. These two are the vertical-rhythm tuning knobs.
        'min-h-[72vh] pb-[8vh] md:min-h-[56vh]',
        // The last entry shouldn't leave most of a screen of empty rail under it.
        'last:min-h-0 last:pb-0',
        onRight ? CARD_INSET_RIGHT_CLASS : CARD_INSET_LEFT_CLASS,
      )}
    >
      <TimelineNode kind={experience.kind} active={revealed} reduced={reduced} />

      {/* Rail-to-card connector. Desktop only - on mobile the card is close
          enough to the rail that a stub would read as clutter. */}
      <span
        aria-hidden
        className={cn(
          'bg-border absolute hidden h-px -translate-y-1/2 md:block',
          NODE_Y_CLASS,
          CONNECTOR_W_CLASS,
          onRight ? 'left-1/2' : 'right-1/2',
        )}
      />

      <article
        className={cn(
          'bg-card text-card-foreground border-border grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border p-5 shadow-sm md:p-6',
          onRight
            ? 'md:grid-cols-[minmax(0,1fr)_auto]'
            : 'md:grid-cols-[auto_minmax(0,1fr)]',
        )}
      >
        {/* Date + title. A plain grid cell holding two motion children -
            variants reach them through context, not through the DOM tree. */}
        <div className={cn('min-w-0', textColumn, 'md:row-start-1')}>
          <motion.p
            variants={item}
            custom={0}
            className='text-muted-foreground text-sm'
          >
            {/* Sighted readers get the kind from the node's shape, which is
                decorative - this is the same information for everyone else. */}
            <span className='sr-only'>{KIND_LABELS[experience.kind]}. </span>
            <time dateTime={range.start.dateTime}>{range.start.label}</time>
            {' — '}
            {range.end ? (
              <time dateTime={range.end.dateTime}>{range.end.label}</time>
            ) : (
              PRESENT_LABEL
            )}
          </motion.p>

          <motion.div variants={item} custom={1} className='mt-1'>
            <h2 className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              {experience.role}
            </h2>
            <p className='text-muted-foreground mt-0.5 text-sm md:text-base'>
              {experience.href ? (
                <a
                  href={experience.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='animated-underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-hidden'
                >
                  {experience.org}
                </a>
              ) : (
                experience.org
              )}
              {experience.location && (
                <>
                  {' · '}
                  {experience.location}
                </>
              )}
            </p>
          </motion.div>
        </div>

        {/* Media. Spans both text rows at md so it can sit alongside the whole
            card; on mobile it's just the second block, above the summary. */}
        <div
          className={cn(
            mediaColumn,
            'md:row-span-2 md:row-start-1 md:self-start',
          )}
        >
          <ExperienceMedia
            media={experience.media}
            org={experience.org}
            side={side}
            reduced={reduced}
          />
        </div>

        <motion.div
          variants={item}
          custom={2}
          className={cn('min-w-0', textColumn, 'md:row-start-2')}
        >
          <p className='text-foreground/80 text-base leading-relaxed break-words'>
            {experience.summary}
          </p>

          {experience.stack && experience.stack.length > 0 && (
            <ul className='mt-3 flex flex-wrap gap-2'>
              {experience.stack.map((tool) => (
                <li key={tool}>
                  <Chip>{tool}</Chip>
                </li>
              ))}
            </ul>
          )}

          <ExpandableDetail
            id={experience.id}
            details={experience.details}
            reduced={reduced}
          />
        </motion.div>
      </article>
    </motion.li>
  );
}
