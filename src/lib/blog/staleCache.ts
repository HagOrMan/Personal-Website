import 'server-only';

// Best-effort "last known good" cache for GitHub content. Next's Data Cache
// already handles the happy path (serving fresh-or-time-stale data); this
// only kicks in when a fetch genuinely fails (GitHub outage, rate limit,
// network blip) and there's a previously successful result to fall back
// on, so a transient GitHub problem degrades to slightly-stale content
// instead of an error page. Resets on cold start and grows with the number
// of distinct posts/assets touched - fine for a personal blog's content
// volume.

const lastGood = new Map<string, unknown>();

export async function withStaleFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fetcher();
    lastGood.set(key, result);
    return result;
  } catch (error) {
    if (lastGood.has(key)) {
      console.error(
        `[blog] GitHub fetch failed for "${key}", serving last-known-good content`,
        error,
      );
      return lastGood.get(key) as T;
    }
    throw error;
  }
}
