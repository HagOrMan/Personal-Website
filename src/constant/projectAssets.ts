/**
 * The repo's record of which projects have media.
 *
 * Posters are committed under public/, so they can't lie. The loops live in
 * Cloudflare R2, which the build can't see — so a `video` entry here is a
 * claim that `projects/{slug}.mp4` was actually uploaded, and it's what makes
 * constant/projects.ts point a card at a loop. Break that promise and the card
 * falls back to its poster forever, which looks exactly like a project you
 * haven't recorded yet.
 *
 * `kb` is a record rather than an input — nothing reads it at runtime, since
 * the cards letterbox with object-contain whatever shape comes in. It's here
 * so "did I re-export this one at 4MB?" is answerable without opening R2.
 * Target is under 800KB, hard ceiling 1.5MB.
 *
 * scripts/prepare-project-assets.sh regenerates this file, but hand-editing is
 * fine — it's plain data, and the script only ever rewrites it whole.
 */
export type ProjectAssetEntry = {
  /** Path under public/. Absent when only a loop exists. */
  poster?: string;
  /** Present once the loop is in the bucket under projects/{slug}.mp4. */
  video?: { kb: number };
};

export const PROJECT_ASSETS: Record<string, ProjectAssetEntry> = {
  'hatch-booking-system': {
    poster: '/projects/hatch-booking-system.webp',
    video: { kb: 94 },
  },
  'mes-website': {
    poster: '/projects/mes-website.webp',
    video: { kb: 302 },
  },
  'island-builder': {
    poster: '/projects/island-builder.webp',
    // Over the 800KB target, under the 1.5MB ceiling. Fine to ship.
    video: { kb: 829 },
  },
  medisafe: {
    poster: '/projects/medisafe.webp',
    video: { kb: 157 },
  },
  monpoke: {
    poster: '/projects/monpoke.webp',
    video: { kb: 101 },
  },
  'piraten-kapern': {
    poster: '/projects/piraten-kapern.webp',
    // Also over the 800KB target — the largest of the set.
    video: { kb: 923 },
  },
  'infinity-chess': {
    poster: '/projects/infinity-chess.webp',
    video: { kb: 60 },
  },
};
