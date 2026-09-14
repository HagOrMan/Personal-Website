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
 * Returns an accent for the given index that:
 *  - never repeats horizontally inside a 3-card row, and
 *  - shifts its starting offset each row so we mostly avoid
 *    the same color stacking directly above/below.
 *
 * Sequence: lush, breeze, nebula, breeze, nebula, lush, nebula, lush, breeze, ...
 *
 * The index must be the card's position among the *visible* cards, so the
 * pattern survives filtering.
 */
export const getAccent = (index: number): AccentKey => {
  const row = Math.floor(index / ACCENTS.length);
  const col = index % ACCENTS.length;
  return ACCENTS[(row + col) % ACCENTS.length];
};
