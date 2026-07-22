import { VideoId } from '@/constant/transcripts';

export type PortfolioVideo = {
  /** Stable kebab-case slug. Drives the R2 video filename and the poster filename - must have a TRANSCRIPTS entry. */
  id: VideoId;
  /** Shown above the video frame; updates as the visitor advances. */
  title: string;
  /** Human label for the ToC / end card, e.g. "1:42". */
  durationLabel: string;
  durationSeconds: number;
  /** Local path under /public, e.g. "/posters/about-me.jpg". */
  poster: string;
  /** Full playback URL, built from NEXT_PUBLIC_R2_BASE_URL - never hardcoded. */
  src: string;
  /** Full transcript text, rendered as-is (paragraph breaks via blank lines). */
  transcript: string;
  /** id of the about-me page section this video relates to, for the sticky shell's scroll-to-section behavior. */
  relatedSectionId?: string;
};
