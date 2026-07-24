import { after } from 'next/server';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import 'server-only';

// This module is the ONLY place the Supabase secret (service role) key is
// used. It bypasses RLS, so it must never be imported into a 'use client'
// file and SUPABASE_SECRET_KEY must never be prefixed NEXT_PUBLIC_.
// `import 'server-only'` above turns any client import into a build error.

const TABLE = 'blog_views';

// Common crawler/preview/CLI user agents. Kept as a single source of truth so
// recording and any future filtering stay in sync. Case-insensitive.
const BOT_UA_RE =
  /bot|crawler|spider|crawling|preview|slurp|facebookexternalhit|embedly|curl|wget|python-requests|headless/i;

// PostgREST caps a single select at its `max_rows` setting (1000 by default).
// For a personal blog that is plenty of headroom for the dashboard windows
// below; if traffic ever outgrows it, move aggregation into SQL views.
const MAX_ROWS = 1000;

let cachedClient: SupabaseClient | null = null;

/** Lazily builds the RLS-bypassing service-role client. Server-only. */
function analyticsClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing required env var: NEXT_PUBLIC_SUPABASE_URL');
  if (!secretKey) throw new Error('Missing required env var: SUPABASE_SECRET_KEY');

  cachedClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// Only .get() is needed, so accept both Headers and Next's ReadonlyHeaders.
type HeaderReader = { get(name: string): string | null };

interface RecordViewInput {
  slug: string;
  wasLocked: boolean;
  hadAccess: boolean;
  /** Precomputed by the caller (reuses the existing owner check). */
  isOwner: boolean;
  headers: HeaderReader;
}

function clientIp(headers: HeaderReader): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip')?.trim() ?? '';
}

/**
 * sha256(ip | ua | salt | YYYY-MM-DD). Deliberately excludes the slug, so the
 * same visitor hashes identically across every post they open on the same UTC
 * day - that is what powers the cross-post ("same person, multiple posts")
 * views on the dashboard. The date component rotates the hash daily, so it
 * cannot be correlated across days or reversed to an IP.
 */
function computeVisitorHash(ip: string, userAgent: string): string | null {
  const salt = process.env.ANALYTICS_IP_SALT;
  if (!salt) {
    console.error('[analytics] Missing ANALYTICS_IP_SALT; skipping view.');
    return null;
  }
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return crypto
    .createHash('sha256')
    .update(`${ip}|${userAgent}|${salt}|${day}`)
    .digest('hex');
}

/** Reduces a referrer to its origin; drops same-origin and unparseable refs. */
function sanitizeReferrer(
  rawReferrer: string | null,
  headers: HeaderReader,
): string | null {
  if (!rawReferrer) return null;
  try {
    const origin = new URL(rawReferrer).origin;

    const host = headers.get('x-forwarded-host') ?? headers.get('host');
    const proto = headers.get('x-forwarded-proto') ?? 'https';
    const selfOrigin = host
      ? `${proto}://${host}`
      : (process.env.NEXT_PUBLIC_SITE_URL ?? '');

    if (selfOrigin && origin === new URL(selfOrigin).origin) return null;
    return origin;
  } catch {
    return null;
  }
}

/**
 * Records a single blog view. Fire-and-forget: schedule it with after() from
 * the page so it runs post-response and never blocks or breaks rendering.
 * Skipped for the owner and for obvious bots. Everything is wrapped so an
 * analytics failure can only ever log, never throw into the caller.
 */
export async function recordView({
  slug,
  wasLocked,
  hadAccess,
  isOwner,
  headers,
}: RecordViewInput): Promise<void> {
  try {
    if (isOwner) return;

    const userAgent = headers.get('user-agent') ?? '';
    if (BOT_UA_RE.test(userAgent)) return;

    const visitorHash = computeVisitorHash(clientIp(headers), userAgent);
    if (!visitorHash) return;

    const client = analyticsClient();

    // First view of THIS slug by THIS visitor today? Because visitor_hash
    // already encodes the UTC date, a matching hash necessarily comes from
    // today, so no separate time filter is needed. A rare race can double-
    // count a "unique" - acceptable, per spec; no locking.
    const { data: existing } = await client
      .from(TABLE)
      .select('id')
      .eq('slug', slug)
      .eq('visitor_hash', visitorHash)
      .limit(1)
      .maybeSingle();

    const { error } = await client.from(TABLE).insert({
      slug,
      visitor_hash: visitorHash,
      is_unique_daily: !existing,
      was_locked: wasLocked,
      had_access: hadAccess,
      referrer: sanitizeReferrer(headers.get('referer'), headers),
      country: headers.get('x-vercel-ip-country'),
    });
    if (error) throw error;
  } catch (err) {
    console.error('[analytics] Failed to record view:', err);
  }
}

/** Convenience wrapper: schedules recordView() to run after the response. */
export function recordViewAfterResponse(input: RecordViewInput): void {
  after(() => recordView(input));
}

// --------------------------------------------------------------------------
// Dashboard queries (owner-only /stats page). All go through the secret-key
// client above; the page never touches the client directly.
// --------------------------------------------------------------------------

interface ViewRow {
  slug: string;
  viewed_at: string;
  is_unique_daily: boolean;
  was_locked: boolean;
  had_access: boolean;
  visitor_hash: string;
  referrer: string | null;
  country: string | null;
}

export interface PerPostStat {
  slug: string;
  locked: boolean;
  totalViews: number;
  uniqueViews: number;
  views7d: number;
  views30d: number;
  firstView: string | null;
  lastView: string | null;
  /** Locked-post-only: hit the password wall vs. actually read the post. */
  wallHits: number;
  reads: number;
  /** Daily unique-view counts for the last 60 days, oldest -> newest. */
  sparkline: number[];
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD (UTC)
  totalViews: number;
  uniqueVisitors: number; // distinct visitor_hash that day
}

export interface CrossPostSession {
  visitorHashShort: string;
  day: string; // YYYY-MM-DD (UTC)
  country: string | null;
  slugs: string[];
  views: number;
}

export interface RecentView {
  slug: string;
  viewedAt: string;
  country: string | null;
  referrer: string | null;
  hadAccess: boolean;
  wasLocked: boolean;
}

export interface DashboardData {
  days: number;
  totals: { totalViews: number; uniqueVisitors: number };
  perPost: PerPostStat[];
  siteDaily: DailyPoint[];
  /** Same-day journeys where one visitor viewed 2+ distinct posts. */
  crossPost: CrossPostSession[];
  recent: RecentView[];
}

const SPARKLINE_DAYS = 60;

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Builds a contiguous list of YYYY-MM-DD keys for the last `days` (UTC). */
function dayRange(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Fetches everything the dashboard needs for the selected range. `days`
 * controls the totals, per-post table, site chart and cross-post list; the
 * 7d/30d columns and 60-day sparklines are fixed reference windows, so we pull
 * a single window of max(days, 60) rows and slice it in memory.
 */
export async function getDashboardData(days: number): Promise<DashboardData> {
  const client = analyticsClient();
  const windowDays = Math.max(days, SPARKLINE_DAYS, 30);

  const { data, error } = await client
    .from(TABLE)
    .select(
      'slug, viewed_at, is_unique_daily, was_locked, had_access, visitor_hash, referrer, country',
    )
    .gte('viewed_at', daysAgoIso(windowDays))
    .order('viewed_at', { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;

  const rows = (data ?? []) as ViewRow[];

  const rangeCutoff = Date.now() - days * 86_400_000;
  const cut7 = Date.now() - 7 * 86_400_000;
  const cut30 = Date.now() - 30 * 86_400_000;
  const cut60 = Date.now() - SPARKLINE_DAYS * 86_400_000;
  const inRange = (r: ViewRow) => new Date(r.viewed_at).getTime() >= rangeCutoff;

  // ---- Per-post table -----------------------------------------------------
  const bySlug = new Map<string, ViewRow[]>();
  for (const r of rows) {
    (bySlug.get(r.slug) ?? bySlug.set(r.slug, []).get(r.slug)!).push(r);
  }

  const sparklineKeys = dayRange(SPARKLINE_DAYS);

  const perPost: PerPostStat[] = [...bySlug.entries()]
    .map(([slug, all]) => {
      const ranged = all.filter(inRange);
      const times = ranged.map((r) => new Date(r.viewed_at).getTime());

      const uniqueByDay = new Map<string, number>();
      for (const r of all) {
        if (r.is_unique_daily && new Date(r.viewed_at).getTime() >= cut60) {
          const key = utcDayKey(r.viewed_at);
          uniqueByDay.set(key, (uniqueByDay.get(key) ?? 0) + 1);
        }
      }

      return {
        slug,
        locked: all.some((r) => r.was_locked),
        totalViews: ranged.length,
        uniqueViews: ranged.filter((r) => r.is_unique_daily).length,
        views7d: all.filter((r) => new Date(r.viewed_at).getTime() >= cut7)
          .length,
        views30d: all.filter((r) => new Date(r.viewed_at).getTime() >= cut30)
          .length,
        firstView: times.length ? new Date(Math.min(...times)).toISOString() : null,
        lastView: times.length ? new Date(Math.max(...times)).toISOString() : null,
        wallHits: ranged.filter((r) => r.was_locked && !r.had_access).length,
        reads: ranged.filter((r) => r.had_access).length,
        sparkline: sparklineKeys.map((k) => uniqueByDay.get(k) ?? 0),
      };
    })
    .filter((p) => p.totalViews > 0)
    .sort((a, b) => b.totalViews - a.totalViews);

  // ---- Site-wide daily chart (over the selected range) --------------------
  const rangeRows = rows.filter(inRange);
  const totalByDay = new Map<string, number>();
  const visitorsByDay = new Map<string, Set<string>>();
  for (const r of rangeRows) {
    const key = utcDayKey(r.viewed_at);
    totalByDay.set(key, (totalByDay.get(key) ?? 0) + 1);
    (visitorsByDay.get(key) ?? visitorsByDay.set(key, new Set()).get(key)!).add(
      r.visitor_hash,
    );
  }
  const siteDaily: DailyPoint[] = dayRange(days).map((day) => ({
    day,
    totalViews: totalByDay.get(day) ?? 0,
    uniqueVisitors: visitorsByDay.get(day)?.size ?? 0,
  }));

  // ---- Cross-post sessions: one visitor, 2+ distinct posts, same day ------
  // visitor_hash is per-visitor-per-day, so grouping by it isolates a single
  // person's same-day journey across the blog.
  const byVisitor = new Map<string, ViewRow[]>();
  for (const r of rangeRows) {
    (
      byVisitor.get(r.visitor_hash) ??
      byVisitor.set(r.visitor_hash, []).get(r.visitor_hash)!
    ).push(r);
  }
  const crossPost: CrossPostSession[] = [...byVisitor.entries()]
    .map(([hash, visits]) => {
      const slugs = [...new Set(visits.map((v) => v.slug))];
      const day = utcDayKey(
        visits.reduce((min, v) => (v.viewed_at < min ? v.viewed_at : min), visits[0]!.viewed_at),
      );
      const country = visits.find((v) => v.country)?.country ?? null;
      return { visitorHashShort: hash.slice(0, 8), day, country, slugs, views: visits.length };
    })
    .filter((s) => s.slugs.length >= 2)
    .sort((a, b) => b.slugs.length - a.slugs.length || b.views - a.views)
    .slice(0, 50);

  // ---- Recent activity (latest 50, independent of the range) --------------
  const { data: recentData, error: recentError } = await client
    .from(TABLE)
    .select('slug, viewed_at, country, referrer, had_access, was_locked')
    .order('viewed_at', { ascending: false })
    .limit(50);
  if (recentError) throw recentError;

  const recent: RecentView[] = (recentData ?? []).map((r) => ({
    slug: r.slug as string,
    viewedAt: r.viewed_at as string,
    country: (r.country as string | null) ?? null,
    referrer: (r.referrer as string | null) ?? null,
    hadAccess: r.had_access as boolean,
    wasLocked: r.was_locked as boolean,
  }));

  return {
    days,
    totals: {
      totalViews: rangeRows.length,
      uniqueVisitors: new Set(rangeRows.map((r) => r.visitor_hash)).size,
    },
    perPost,
    siteDaily,
    crossPost,
    recent,
  };
}
