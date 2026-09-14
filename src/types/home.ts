/**
 * Which slot an entry takes in the homepage ribbon — the short preview of my
 * experience and my projects that sits under the hero.
 *
 * Deliberately `1 | 2` rather than a boolean: the ribbon is built around
 * exactly two entries a section, so a third one should be a compile error you
 * have to widen this type to allow, not something that quietly lands on the
 * page and breaks the alternation.
 *
 * The number is also the running order, and it has to be — neither section's
 * natural sort puts the right entry first. The MES role runs to `present`, so
 * by date it leads ahead of Scotiabank, which is the wrong way round for the
 * one entry meant to open the page.
 *
 * Unset means "not on the homepage", which is the honest default: every entry
 * has its own place on /experience or /projects regardless, and this only
 * decides which two get previewed.
 */
export type HomeSlot = 1 | 2;
