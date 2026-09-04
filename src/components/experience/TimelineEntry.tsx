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
import { LogoMark, PhotoPlate } from './ExperienceMedia';
import {
  CARD_INSET_LEFT_CLASS,
  CARD_INSET_RIGHT_CLASS,
  CONNECTOR_W_CLASS,
  ENTRY_IN_VIEW_MARGIN,
  entryContainerVariants,
  entryItemVariants,
  NODE_Y_CLASS,
  PHOTO_HALF_LEFT_CLASS,
  PHOTO_HALF_RIGHT_CLASS,
  RAIL_X_CLASS,
  type TimelineSide,
} from './motion';
import { TimelineNode } from './TimelineRail';

/**
 * One experience: its node on the rail, the card hanging off it, and - if the
 * entry has a photo - that photo in the timeline's other half.
 *
 * `side` is a prop rather than something measured at mount, and it only takes
 * effect from `md` up - below that every card sits right of the rail no
 * matter what it was passed. That keeps the layout a single implementation
 * and keeps it correct on the server, before any viewport exists.
 */
export function TimelineEntry({
  experience,
  side,
  lit,
}: {
  experience: Experience;
  side: TimelineSide;
  /**
   * Whether the rail's fill has reached this entry's node. Owned by Timeline,
   * which is the only component that can compare a node's position against
   * the fill's progress - the two would otherwise be independent animations
   * that happen to run at similar times.
   */
  lit: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, {
    once: true,
    margin: ENTRY_IN_VIEW_MARGIN,
  });

  // With motion off there's no reveal to wait for, so the entry is simply
  // there rather than waiting on an observer it doesn't need.
  const revealed = reduced || inView;

  const range = formatRange(experience.start, experience.end);
  const item = entryItemVariants(reduced, side);

  const { logo, photo } = experience;
  const onRight = side === 'right';

  /**
   * The photo takes the half the card isn't using, so its side - and every
   * direction derived from it - is the mirror of the card's.
   */
  const photoSide: TimelineSide = onRight ? 'left' : 'right';

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
        // Also the containing block for the photo at md - see PHOTO_HALF_*.
        'relative',
        // scroll-mt clears the fixed navbar when someone lands on /experience#slug.
        'scroll-mt-24',
        // One entry roughly fills the view, with the next node peeking below.
        // Shorter at md, which is what puts more of the timeline on screen on
        // a desktop. These two are the vertical-rhythm tuning knobs.
        'min-h-[72vh] pb-[8vh] md:min-h-[56vh]',
        // The last entry shouldn't leave most of a screen of empty rail under it.
        'last:min-h-0 last:pb-0',
        onRight ? CARD_INSET_RIGHT_CLASS : CARD_INSET_LEFT_CLASS,
      )}
    >
      <TimelineNode kind={experience.kind} reached={lit} reduced={reduced} />

      {/* Rail-to-card connector. It grows out of the rail and takes the
          node's colour as the fill arrives, so the rail visibly reaches for
          the card rather than the card just sitting near a line. */}
      <span
        aria-hidden
        className={cn(
          'bg-border absolute h-0.5 -translate-y-1/2 rounded-full transition-[width,background-color] duration-500 motion-reduce:transition-none',
          NODE_Y_CLASS,
          // Anchored on the rail's centre line so the width grows towards the
          // card. Below md every card is right of the rail whatever `side`
          // says, so both variants start from the rail's fixed left inset;
          // only at md does a left-side card flip to growing leftwards.
          onRight ? RAIL_X_CLASS : 'left-4 md:left-auto md:right-1/2',
          lit ? cn(CONNECTOR_W_CLASS, 'bg-breeze-400') : 'w-0',
          // Reduced motion renders the rail full, so its arms are out too.
          // Literal because Tailwind only sees complete class names - keep
          // this width in step with CONNECTOR_W_CLASS.
          'motion-reduce:w-10! motion-reduce:bg-breeze-400!',
        )}
      />

      <article
        // Deliberately not `relative`: the photo below escapes this card at
        // md by resolving against the <li> instead.
        className='bg-card text-card-foreground border-border flex flex-col gap-4 rounded-xl border p-5 shadow-sm md:p-6'
      >
        {/* Heading row: the text block, and the logo tucked into the card's
            outer corner beside it. A flex row rather than a grid column, so
            the logo shares the heading's line at every width instead of
            claiming a row of its own on mobile - and so everything below
            keeps the card's full width without any span juggling. */}
        <div
          className={cn(
            'flex items-start gap-4',
            // At md the outer corner is whichever side faces away from the
            // rail; reversing moves the logo there without moving the text.
            !onRight && 'md:flex-row-reverse',
          )}
        >
          <div className='min-w-0 flex-1'>
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

          {logo && (
            <div className='shrink-0'>
              <LogoMark
                logo={logo}
                org={experience.org}
                side={side}
                reduced={reduced}
              />
            </div>
          )}
        </div>

        {/* One element, two homes. Below md it's an ordinary block inside the
            card, sitting under the heading. From md it's lifted out onto the
            empty half of the timeline opposite the card - same DOM node, no
            duplicate image, no viewport measured in JS. */}
        {photo && (
          <div
            className={
              photoSide === 'left'
                ? PHOTO_HALF_LEFT_CLASS
                : PHOTO_HALF_RIGHT_CLASS
            }
          >
            <PhotoPlate photo={photo} side={photoSide} reduced={reduced} />
          </div>
        )}

        <motion.div variants={item} custom={2} className='min-w-0'>
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
