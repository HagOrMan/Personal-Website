'use client';

import { Chip } from '@/components/ui/Chip';
import { TReference } from '@/types/references';

export type ReferenceCardProps = {
  reference: TReference;
  /** Opens the modal holding this reference's full text. */
  onReadFull: () => void;
};

/**
 * One recommendation, as an excerpt plus attribution.
 *
 * `h-full` + `mt-auto` on the caption is what keeps card bottoms aligned
 * across a grid row: the quotes differ in length, so without it the
 * attribution blocks would sit at ragged heights next to each other.
 */
export function ReferenceCard({ reference, onReadFull }: ReferenceCardProps) {
  return (
    <figure className='bg-card border-border hover:border-primary-rgb-400/50 flex h-full w-full flex-col gap-6 rounded-xl border p-6 motion-safe:transition-colors md:p-7'>
      {/* The excerpt is the point of the card, so it's the largest text here.
          The ch cap keeps the line length readable when a single reference
          fills the whole grid row - the card stretches, the text doesn't. */}
      <blockquote className='text-foreground/90 max-w-[65ch] text-lg leading-relaxed'>
        {reference.referenceShort}
      </blockquote>

      <figcaption className='mt-auto flex flex-col items-start gap-1'>
        {reference.profileUrl ? (
          <a
            href={reference.profileUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='text-foreground animated-underline cursor-newtab font-semibold'
          >
            {reference.name}
          </a>
        ) : (
          <span className='text-foreground font-semibold'>
            {reference.name}
          </span>
        )}

        <span className='text-foreground/75 text-sm'>{reference.title}</span>
        <span className='text-foreground/75 text-sm'>
          {reference.organization}
        </span>

        {/* How we actually worked together - who managed whom - is the part
            that gives the quote its weight, so it gets a pill rather than
            becoming a fourth line of small grey text under the job title. */}
        <Chip className='mt-2 whitespace-normal'>{reference.relationship}</Chip>

        <button
          type='button'
          onClick={onReadFull}
          className='text-primary-rgb-600 dark:text-primary-rgb-400 animated-underline focus-visible:ring-ring mt-4 cursor-pointer rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-hidden'
        >
          Read full recommendation
        </button>
      </figcaption>
    </figure>
  );
}
