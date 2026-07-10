import 'server-only';

// In-memory sliding-window-ish counter. This resets whenever the serverless
// instance recycles/cold-starts, so it's a best-effort throttle, not a hard
// guarantee - if you need durable rate limiting across instances, swap this
// for Upstash/Redis (INCR + EXPIRE on the same key).

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

interface Entry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
