'use client';

import Link from 'next/link';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';
import { shortHash } from '@/lib/blog/visitorHash';

const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 120;

/**
 * One visitor's same-day journey, flattened for display. Titles are resolved
 * server-side so this component needs neither the post index nor the
 * analytics types (which live behind `server-only`).
 */
export interface VisitorJourney {
  day: string;
  country: string | null;
  views: number;
  posts: { slug: string; title: string }[];
}

/**
 * The daily visitor id, revealing that visitor's whole same-day journey on
 * hover. Owner-only page, and the hash is salted and date-scoped, so this
 * exposes nothing that could identify a person - it only answers "which of
 * these rows were the same reader?".
 *
 * Renders as plain text when the visitor has no multi-post journey (they read
 * one post, or their journey falls outside the selected range), so a card
 * only ever opens on something worth reading.
 */
export function VisitorHoverCard({
  visitorHash,
  journey,
  currentSlug,
}: {
  visitorHash: string;
  journey?: VisitorJourney;
  /** Marked as "this view" in the list, to orient the reader. */
  currentSlug?: string;
}) {
  const id = (
    <span className='text-muted-foreground font-mono text-xs'>
      {shortHash(visitorHash)}
    </span>
  );

  if (!journey) return id;

  return (
    <HoverCard openDelay={OPEN_DELAY_MS} closeDelay={CLOSE_DELAY_MS}>
      <HoverCardTrigger asChild>
        <button
          type='button'
          className='hover:text-foreground cursor-help rounded-sm underline decoration-dotted underline-offset-4'
        >
          {id}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className='w-80' align='start'>
        <div className='flex flex-col gap-2'>
          <span className='text-foreground font-mono text-xs font-semibold'>
            {shortHash(visitorHash)}
          </span>
          <span className='text-muted-foreground/70 text-xs'>
            {journey.day}
            {journey.country ? ` · ${journey.country}` : ''} ·{' '}
            {journey.posts.length} posts · {journey.views} views
          </span>

          <ul className='flex flex-col gap-1.5'>
            {journey.posts.map((post) => (
              <li key={post.slug} className='text-sm leading-snug'>
                <Link
                  href={`/blog/${post.slug}`}
                  className='text-foreground hover:text-primary'
                >
                  {post.title}
                </Link>
                {post.slug === currentSlug && (
                  <span className='text-muted-foreground/70 ml-1.5 text-xs'>
                    (this view)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
