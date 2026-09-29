import type { CSSProperties } from 'react';
import Link from 'next/link';

import { Music } from 'lucide-react';

import { mediaUrl } from '@/lib/media';
import { compositionHref, formatDuration } from '@/lib/musicFormat';
import { ACCENT_VARS, getAccent } from '@/lib/projects/accents';
import { cn } from '@/lib/utils';
import type { Composition } from '@/types/music';

type CompositionCardProps = {
  composition: Composition;
  /** Position among the cards actually shown, for the accent rotation. */
  index: number;
  /** One below whatever heading the list sits under. */
  headingAs?: 'h2' | 'h3';
  className?: string;
};

/**
 * A piece in a list, linking to its page. Soft navigation from /music or
 * /about-me is intercepted by app/@modal, so this opens the modal there.
 */
export function CompositionCard({
  composition,
  index,
  headingAs: Heading = 'h2',
  className,
}: CompositionCardProps) {
  const accent = ACCENT_VARS[getAccent(index)];
  const { assets } = composition;

  return (
    <Link
      href={compositionHref(composition)}
      // The page underneath stays put while the modal opens over it.
      scroll={false}
      className={cn(
        'group bg-card border-border flex h-full flex-col overflow-hidden rounded-xl border',
        'hover:border-[var(--card-accent)] focus-visible:border-[var(--card-accent)] motion-safe:transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
        className,
      )}
      style={{ '--card-accent': accent.border } as CSSProperties}
    >
      <div className='border-border relative aspect-[3/2] overflow-hidden border-b bg-white'>
        {assets ? (
          // Decorative: the heading below names the piece.
          <img
            src={mediaUrl(assets.og)}
            alt=''
            loading='lazy'
            decoding='async'
            className='size-full object-cover object-top'
          />
        ) : (
          <div className='bg-muted flex size-full items-center justify-center'>
            <Music aria-hidden className='text-muted-foreground size-8' />
          </div>
        )}
      </div>

      <div className='flex flex-1 flex-col gap-1.5 p-5'>
        <span
          className='tracking-eyebrow text-xs font-semibold uppercase'
          style={{ color: accent.text }}
        >
          {composition.instrumentation}
        </span>
        <Heading className='text-foreground text-lg font-semibold'>
          {composition.title}
        </Heading>
        {composition.subtitle && (
          <p className='text-foreground/70 text-sm'>{composition.subtitle}</p>
        )}
        <p className='text-muted-foreground mt-auto pt-2 text-sm'>
          {composition.year}
          {assets && ` · ${formatDuration(assets.durationSeconds)}`}
        </p>
      </div>
    </Link>
  );
}
