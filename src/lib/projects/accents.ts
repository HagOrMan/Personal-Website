export type AccentKey = 'lush' | 'breeze' | 'nebula';

export const ACCENTS: AccentKey[] = ['lush', 'breeze', 'nebula'];

/**
 * `border` and `glow` are only ever seen against each other on a card, so
 * they're tuned as a pair. `text` is the same accent at a weight that holds
 * up as type on the page background — see the notes beside these in
 * globals.css. Anything rendering an accent as words wants `text`.
 */
export const ACCENT_VARS: Record<
  AccentKey,
  { border: string; glow: string; text: string }
> = {
  lush: {
    border: 'var(--accent-lush-border)',
    glow: 'var(--accent-lush-glow)',
    text: 'var(--accent-lush-text)',
  },
  breeze: {
    border: 'var(--accent-breeze-border)',
    glow: 'var(--accent-breeze-glow)',
    text: 'var(--accent-breeze-text)',
  },
  nebula: {
    border: 'var(--accent-nebula-border)',
    glow: 'var(--accent-nebula-glow)',
    text: 'var(--accent-nebula-text)',
  },
};

/**
 * The site's accent for the thing at `index`, wherever accents rotate: the
 * /projects grid and the homepage ribbon's rows.
 *
 * A flat rotation, leading with lush because lush is the primary (it's what
 * --primary resolves to). At the two columns the grid caps at, consecutive
 * indices always differ so no row repeats, and 2 and 3 are coprime so both
 * columns cycle rather than stacking a colour.
 *
 * The index must be the position among the *visible* items, so the pattern
 * survives filtering.
 */
export const getAccent = (index: number): AccentKey =>
  ACCENTS[index % ACCENTS.length];
