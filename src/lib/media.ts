// The R2 custom domain. Empty when unset so a missing env var 404s the one
// asset rather than crashing the page.
const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL ?? '';

/** Public URL for an R2 object key, e.g. "music/nocturne/ab12cd34/audio.mp3". */
export function mediaUrl(key: string): string {
  return `${R2_BASE_URL}/${key}`;
}
