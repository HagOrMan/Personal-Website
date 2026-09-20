import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The one shape for an action anywhere on the site: a button or a link that
 * *does* something. Project links on the homepage ribbon and in the /projects
 * card footers, the LinkedIn post link on /experience, the row under "Let's
 * Connect" on /about-me.
 *
 * ── Radius means role ─────────────────────────────────────────────────────
 *
 *   rounded-full  a label. Chips and tags — content, not controls, and mostly
 *                 non-interactive spans. See components/ui/Chip.
 *   rounded-lg    an action. This file.
 *   rounded-md    a dense control inside a group: segmented tabs, dropdown
 *                 items, form fields. Tighter because it's nested.
 *   rounded-xl    a surface that holds content: cards, media frames.
 *   rounded-3xl   the glass object, and only that — its whole job is to not
 *                 look like a card.
 *
 * Round is a thing, square-ish is a doing. The practical payoff is that
 * actions sit in rows and pills don't: round caps pull away from their
 * neighbours, so a row of pills reads as scattered at any gap that doesn't
 * look cramped, while straight vertical sides line up and a footer of three
 * actions reads as one control group.
 *
 * 8px is `--radius` — a half-step under the 12px cards these sit inside, so
 * they read as nested rather than unrelated.
 *
 * ── The accent variant ────────────────────────────────────────────────────
 *
 * `accent` reads --row-accent, which the surface sets: RibbonRow puts it on
 * the text half, ProjectSpotlightCard on the article. That's what lets the
 * primary action take the colour of the glow behind the media, or the card's
 * own border, without threading a prop through everything in between.
 *
 * Arbitrary values rather than an inline style object, because an inline
 * backgroundColor outranks every class and no `hover:bg-*` could replace it.
 *
 * ── Cursors ───────────────────────────────────────────────────────────────
 *
 * No `cursor-pointer` here, and don't add one at a call site rendering an
 * <a target="_blank">: globals.css gives those the new-tab cursor from the
 * base layer, and a cursor utility outranks it, quietly removing the one
 * affordance saying the link leaves the site. Non-link buttons should pass
 * `cursor-pointer` themselves.
 */
const actionBase = cva(
  [
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg',
    'text-sm font-medium whitespace-nowrap',
    'transition-colors motion-reduce:transition-none',
    // Focus lands exactly where hover does at every call site below, so none
    // of these ever react to a mouse in a way they won't react to a keyboard.
    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
  ],
  {
    variants: {
      size: {
        /** Labelled. The default, and what most actions are. */
        default: 'h-9 px-4',
        /**
         * A square with one glyph and no label - the tertiary rung, for a
         * link worth offering but not worth a word. Same height as the
         * labelled one so a row of mixed sizes still lines up.
         *
         * Only safe where the element carries its own aria-label: the glyph
         * is aria-hidden, so without one the control has no accessible name.
         */
        icon: 'size-9 justify-center px-0',
      },
      variant: {
        /** The one filled action in a group. Takes the surface's accent. */
        accent:
          'border border-[var(--row-accent)] bg-[color-mix(in_srgb,var(--row-accent)_10%,transparent)] text-[var(--row-accent)] hover:bg-[color-mix(in_srgb,var(--row-accent)_28%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--row-accent)_28%,transparent)]',

        /** Everything beside the accent one. Neutral until pointed at. */
        outline:
          'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 focus-visible:text-foreground focus-visible:border-foreground/30 border',

        /**
         * No border and no fill, for the action that ends a group — "Read
         * more", which is the only link on a project card that keeps you on
         * the site. Narrower padding because there's no box to sit inside.
         */
        ghost: 'text-muted-foreground hover:text-foreground px-1',

        /**
         * The LinkedIn post link. The rail's breeze rather than LinkedIn's
         * own #0A66C2 — within a few points of breeze-700 anyway, so it reads
         * as the brand colour while staying a colour the page owns. Two
         * shades because breeze-400 washes out on a light card.
         *
         * Muted at rest like `outline`: on /experience it shares a row with
         * More, which should keep the only colour there until this one is
         * actually pointed at.
         */
        linkedin:
          'border-border text-muted-foreground hover:border-breeze-600/50 hover:bg-breeze-500/10 hover:text-breeze-700 focus-visible:border-breeze-600/50 focus-visible:bg-breeze-500/10 focus-visible:text-breeze-700 dark:hover:border-breeze-400/50 dark:hover:bg-breeze-400/10 dark:hover:text-breeze-300 dark:focus-visible:border-breeze-400/50 dark:focus-visible:bg-breeze-400/10 dark:focus-visible:text-breeze-300 border',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'outline',
    },
  },
);

export type ActionVariantProps = VariantProps<typeof actionBase> & {
  /** Extra classes, merged last so they win any conflict. */
  className?: string;
};

/**
 * The cva above, run through `cn`. The merge is load-bearing: cva only
 * concatenates, so a variant that overrides part of a size (`ghost`'s px-1
 * against the size's px-4) would otherwise be settled by stylesheet order
 * rather than by the order written here — and Tailwind emits px-1 first, so
 * the variant loses. tailwind-merge drops the earlier of any conflicting
 * pair, which makes the ordering below mean what it looks like it means.
 *
 * `className` merges the same way rather than piling up behind the cva.
 */
export function actionVariants({ className, ...props }: ActionVariantProps = {}) {
  return cn(actionBase(props), className);
}
