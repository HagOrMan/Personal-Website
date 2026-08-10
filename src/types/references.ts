export type TReference = {
  name: string;
  title: string;
  organization: string;
  /** How this person and I worked together (e.g. who managed whom). */
  relationship: string;
  /** The excerpt shown on the card. May contain "[…]" marking elided text. */
  referenceShort: string;
  /** The full recommendation, shown in the modal. Paragraphs split on blank lines. */
  reference: string;
  /**
   * The recommender's own LinkedIn profile (a plain /in/ link, no login wall).
   * Optional: when set, their name on the card links here so a visitor can
   * confirm the person is real. Left unset until I have the URLs, in which
   * case the name renders as plain text rather than a dead link.
   */
  profileUrl?: string;
};
