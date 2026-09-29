/** A piece as authored in src/constant/music.ts. */
export type CompositionEntry = {
  /** URL segment, and the basename of its source file: music-src/{slug}.mscz */
  slug: string;
  title: string;
  /** e.g. "for string quartet" */
  subtitle?: string;
  /** e.g. "Violin, Viola, Cello" */
  instrumentation: string;
  year: number;
  /** Ascending sort position on /music. */
  order: number;
  /** Shown in the Music section on /about-me. */
  featured: boolean;
  /**
   * Plain text, not markdown. A blank line starts a new paragraph; a single
   * newline is kept as a line break.
   */
  writeup: string;
};

/**
 * One piece's exported files, as written to src/data/music.json by
 * scripts/process-music.mjs. Values are R2 keys, not URLs - see mediaUrl().
 */
export type CompositionAssets = {
  /** Hash of the source .mscz; every key below sits under music/{slug}/{hash}/. */
  hash: string;
  audio: string;
  pdf: string;
  /** Page 1 as a small PNG, for the share card and index thumbnails. */
  og: string;
  /** Score pages in order. */
  pages: string[];
  /** Page aspect ratio, from the first SVG's viewBox. */
  pageWidth: number;
  pageHeight: number;
  durationSeconds: number;
};

export type Composition = CompositionEntry & {
  /** Null until the piece has been exported and uploaded. */
  assets: CompositionAssets | null;
};
