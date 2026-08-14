// Deliberately free of both 'use client' and 'server-only': the analytics
// dashboard formats visitor ids in server components (the journeys table) and
// the hover card re-formats the same id on the client, so this has to be
// importable from either side.

/** Enough of the daily visitor digest to eyeball two rows as the same person. */
export function shortHash(visitorHash: string): string {
  return visitorHash.slice(0, 8);
}
