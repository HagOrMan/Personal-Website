import { ArrowUpRight } from 'lucide-react';

import { LinkedInGlyph } from '@/components/icons/LinkedInGlyph';
import { cn } from '@/lib/utils';

/**
 * The link out to whatever I posted on LinkedIn about an experience. Lives in
 * the card's action row, beside More/Less.
 *
 * Labelled rather than icon-only, and that's the whole design decision. The
 * card already carries the org's own logo in its outer corner, so a lone
 * LinkedIn bug at the other end of it reads as "the company's LinkedIn page"
 * rather than "something I wrote" - two words settle it, and cost about 70px.
 *
 * Bordered, and `rounded-md` rather than the pill shape the stack chips use:
 * the border is what separates it from More, which is a bare text button, and
 * the corner radius is what stops it being mistaken for one more chip.
 */
export function LinkedInPostLink({
  href,
  org,
  role,
}: {
  href: string;
  /** Both only ever reach the aria-label - see below. */
  org: string;
  role: string;
}) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      // The visible label is the same two words on every card, so pulled out
      // of context - a screen reader's list of links, say - it says nothing
      // about which post it opens. aria-label replaces the text rather than
      // adding to it, so the accessible name gets the role and org the sighted
      // reader already has from the heading a few lines above.
      aria-label={`LinkedIn post about ${role} at ${org} (opens in a new tab)`}
      className={cn(
        'group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium',
        // Muted at rest: More is the card's primary action and should keep the
        // only colour in the row until this one is actually pointed at.
        'border-border text-muted-foreground',
        // Hover and focus land on the same place, so the link never reacts to
        // a mouse in a way it won't react to a keyboard. The rail's breeze
        // blue rather than LinkedIn's own #0A66C2 - which sits within a few
        // points of breeze-700 anyway, so this reads as the brand colour while
        // still being a colour the rest of the page owns. Two shades for the
        // same reason More has two: breeze-400 washes out on the light card.
        'hover:border-breeze-600/50 hover:bg-breeze-500/10 hover:text-breeze-700',
        'focus-visible:border-breeze-600/50 focus-visible:bg-breeze-500/10 focus-visible:text-breeze-700',
        'dark:hover:border-breeze-400/50 dark:hover:bg-breeze-400/10 dark:hover:text-breeze-300',
        'dark:focus-visible:border-breeze-400/50 dark:focus-visible:bg-breeze-400/10 dark:focus-visible:text-breeze-300',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
        'transition-colors motion-reduce:transition-none',
      )}
    >
      <LinkedInGlyph className='size-3.5' />
      LinkedIn post
      {/* The "this leaves the site" tell. Redundant on a desktop pointer -
          globals.css swaps in the new-tab cursor for every target="_blank" -
          but that cue doesn't exist on touch, where most of this page is read.
          The nudge is motion-safe only: it's decoration, and a transform that
          snaps rather than eases is worse than no transform at all. */}
      <ArrowUpRight
        aria-hidden
        className='size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-px motion-safe:group-hover:-translate-y-px motion-safe:group-focus-visible:translate-x-px motion-safe:group-focus-visible:-translate-y-px'
      />
    </a>
  );
}
