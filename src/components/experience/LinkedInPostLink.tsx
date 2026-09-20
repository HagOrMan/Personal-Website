import { ArrowUpRight } from 'lucide-react';

import { LinkedInGlyph } from '@/components/icons/LinkedInGlyph';
import { actionVariants } from '@/components/ui/actionVariants';
import { cn } from '@/lib/utils';

/**
 * The link out to whatever I posted on LinkedIn about an experience. Renders
 * in two places: the action row of a /experience timeline card, beside
 * More/Less, and the text half of an experience row on the homepage ribbon.
 *
 * Labelled rather than icon-only, and that's the whole content decision. Both
 * surfaces already carry the org's own logo a few lines up, so a lone LinkedIn
 * bug reads as "the company's LinkedIn page" rather than "something I wrote" -
 * two words settle it, and cost about 70px.
 *
 * Shape and size come from actionVariants, like every other action on the
 * site, so this renders the same in both places without knowing where it is.
 *
 * The accessible name is the aria-label, not the visible text: the visible
 * label is the same two words on every card, so pulled out of context - a
 * screen reader's list of links, say - it says nothing about which post it
 * opens. aria-label replaces the text rather than adding to it, so the
 * accessible name gets the role and org the sighted reader already has from
 * the heading a few lines above.
 */
export function LinkedInPostLink({
  href,
  org,
  role,
  className,
}: {
  href: string;
  /** Both only ever reach the aria-label - see above. */
  org: string;
  role: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`LinkedIn post about ${role} at ${org} (opens in a new tab)`}
      className={cn('group', actionVariants({ variant: 'linkedin' }), className)}
    >
      <LinkedInGlyph className='size-3.5' />
      LinkedIn post
      {/* The "this leaves the site" tell. Redundant on a desktop pointer -
          globals.css swaps in the new-tab cursor for every target="_blank" -
          but that cue doesn't exist on touch, where most of this is read.
          The nudge is motion-safe only: it's decoration, and a transform that
          snaps rather than eases is worse than no transform at all. */}
      <ArrowUpRight
        aria-hidden
        className='size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-px motion-safe:group-hover:-translate-y-px motion-safe:group-focus-visible:translate-x-px motion-safe:group-focus-visible:-translate-y-px'
      />
    </a>
  );
}
