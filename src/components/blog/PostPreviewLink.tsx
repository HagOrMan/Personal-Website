'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { Lock } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';
import type { PostPreview } from '@/lib/blog/preview';

// Long enough that sweeping the pointer across a link on the way somewhere
// else doesn't summon a card, short enough that deliberate hovering feels
// instant. The close delay covers the diagonal trip into the card itself.
const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 120;

// Matches the tag cap on the blog index - enough to characterize a post
// without the card growing taller than the text it is previewing.
const MAX_PREVIEW_TAGS = 3;

function formatDate(value: string | Date): string {
  // timeZone 'UTC' keeps the displayed day matching what was authored.
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export type PostPreviewLinkProps = {
  /**
   * The post being previewed. Undefined means "no preview available" - the
   * slug no longer resolves to a post (renamed, deleted, or from a source
   * that failed to list) - and the link renders bare rather than opening an
   * empty card.
   */
  preview?: PostPreview;
  /** Falls back to the preview's slug, for callers with nothing to wrap. */
  href?: string;
  children: ReactNode;
  className?: string;
};

/**
 * A link to a post that reveals a summary card on hover. Radix HoverCard is
 * pointer-only by design (it never opens on tap), so everything the card
 * shows is treated as an enrichment of the link, never as the only route to
 * the information - touch users get the plain link and the post itself.
 */
export function PostPreviewLink({
  preview,
  href,
  children,
  className,
}: PostPreviewLinkProps) {
  const target = href ?? (preview ? `/blog/${preview.slug}` : undefined);

  if (!preview || !target) {
    return target ? (
      <Link href={target} className={className}>
        {children}
      </Link>
    ) : (
      <span className={className}>{children}</span>
    );
  }

  const tags = preview.tags ?? [];

  return (
    <HoverCard openDelay={OPEN_DELAY_MS} closeDelay={CLOSE_DELAY_MS}>
      <HoverCardTrigger asChild>
        <Link href={target} className={className}>
          {children}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className='w-80' align='start'>
        <div className='flex flex-col gap-2'>
          <span className='text-foreground flex items-start gap-2 leading-snug font-semibold'>
            {preview.locked && (
              <Lock
                className='mt-0.5 size-3.5 shrink-0'
                aria-label='Password protected'
              />
            )}
            {preview.title}
          </span>

          {preview.summary && (
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {preview.summary}
            </p>
          )}

          <span className='text-muted-foreground/70 flex flex-wrap items-center gap-x-2 text-xs'>
            {preview.date && <span>{formatDate(preview.date)}</span>}
            {preview.date && <span aria-hidden>·</span>}
            <span>{preview.readTimeMinutes} min read</span>
          </span>

          {tags.length > 0 && (
            <span className='flex flex-wrap items-center gap-1.5'>
              {tags.slice(0, MAX_PREVIEW_TAGS).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
              {tags.length > MAX_PREVIEW_TAGS && (
                <span className='text-muted-foreground/70 text-xs'>
                  +{tags.length - MAX_PREVIEW_TAGS}
                </span>
              )}
            </span>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * The same card, labelled by the raw slug. Convenience wrapper for the
 * analytics dashboard, where every slug comes from a view row and may or may
 * not still correspond to a live post.
 *
 * Takes the single resolved preview rather than a lookup map: the dashboard
 * renders dozens of these, and a map prop would serialize a full copy of the
 * post index into the payload once per link.
 */
export function SlugPreviewLink({
  slug,
  preview,
  className,
  children,
}: {
  slug: string;
  preview?: PostPreview;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <PostPreviewLink
      preview={preview}
      href={`/blog/${slug}`}
      className={className}
    >
      {children ?? slug}
    </PostPreviewLink>
  );
}
