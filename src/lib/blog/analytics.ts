import { after } from 'next/server';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import { requiredEnv } from '@/lib/env';

import 'server-only';

// This module is the ONLY place the Supabase secret (service role) key is
// used. It bypasses RLS, so it must never be imported into a 'use client'
// file and SUPABASE_SECRET_KEY must never be prefixed NEXT_PUBLIC_.
// `import 'server-only'` above turns any client import into a build error.

const TABLE = 'blog_views';

// Automated clients, matched case-insensitively against the UA.
//
// Plenty of them never say "bot": the user-triggered AI fetchers, Meta's
// crawler, and every bare HTTP library arrive under a name the obvious tokens
// miss. A match only sets `is_bot` - the row is still written, so the next
// crawl can be identified from its own user agent instead of inferred from
// timing after the fact.
const BOT_UA_RE = new RegExp(
  [
    // Self-identifying crawlers.
    'bot',
    'crawler',
    'spider',
    'crawling',
    'preview',
    'slurp',
    // Named agents carrying no "bot" token.
    'facebookexternalhit',
    'meta-externalagent',
    'embedly',
    'chatgpt',
    'perplexity',
    'claude-user',
    // Scripted clients and HTTP libraries.
    'curl',
    'wget',
    'headless',
    'scrapy',
    'libwww-perl',
    'python-requests',
    'aiohttp',
    'httpx',
    'urllib',
    'go-http-client',
    'node-fetch',
    'axios',
    'okhttp',
    'guzzle',
    'java/',
  ].join('|'),
  'i',
);

// A real UA sits well under this. The cap exists so a client sending a
// megabyte of junk in the header cannot bloat the table one row at a time.
const MAX_UA_LENGTH = 512;

// PostgREST caps a single select at its `max_rows` setting (1000 by default).
// For a personal blog that is plenty of headroom for the dashboard windows
// below; if traffic ever outgrows it, move aggregation into SQL views.
const MAX_ROWS = 1000;

let cachedClient: SupabaseClient | null = null;

/** Lazily builds the RLS-bypassing service-role client. Server-only. */
function analyticsClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  cachedClient = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
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
 * Skipped for the owner; automated clients are recorded and flagged `is_bot`
 * rather than dropped, so the dashboard can exclude them while the evidence
 * survives. Everything is wrapped so an analytics failure can only ever log,
 * never throw into the caller.
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
      user_agent: userAgent.slice(0, MAX_UA_LENGTH) || null,
      is_bot: BOT_UA_RE.test(userAgent),
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
  /**
   * Whether any view in the window was recorded while the post was locked.
   * This is post history, NOT current state: `was_locked` is a snapshot taken
   * at view time, so this stays true after a post is unlocked, until those
   * rows age out of the window. Read current lock state off the post's own
   * metadata (PostMeta.locked) instead.
   */
  wasEverLocked: boolean;
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
  /**
   * Full daily visitor hash. Not identifying (salted, and the UTC date is
   * part of the digest, so it cannot be correlated across days), but it is
   * the join key between a recent view and the journey it belongs to - so it
   * must be the whole digest, not a display-truncated prefix.
   */
  visitorHash: string;
  day: string; // YYYY-MM-DD (UTC)
  country: string | null;
  slugs: string[];
  views: number;
  /** Most recent view in the journey; what the dashboard orders on. */
  lastViewedAt: string;
}

export interface RecentView {
  slug: string;
  viewedAt: string;
  country: string | null;
  referrer: string | null;
  hadAccess: boolean;
  wasLocked: boolean;
  /** Joins this view to its CrossPostSession, when the visitor had one. */
  visitorHash: string;
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

  // is_bot is filtered server-side, ahead of the row cap. A single crawl
  // writes hundreds of rows in seconds, so filtering in JS afterwards would
  // let one run spend the entire MAX_ROWS window and push real traffic out
  // of the dashboard.
  const { data, error } = await client
    .from(TABLE)
    .select(
      'slug, viewed_at, is_unique_daily, was_locked, had_access, visitor_hash, referrer, country',
    )
    .eq('is_bot', false)
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
        wasEverLocked: all.some((r) => r.was_locked),
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
      // A visitor_hash already encodes one UTC day, so every visit here is
      // same-day and any row's date is the journey's date. The newest
      // timestamp is what gives ordering finer resolution than that day.
      const lastViewedAt = visits.reduce(
        (max, v) => (v.viewed_at > max ? v.viewed_at : max),
        visits[0]!.viewed_at,
      );
      const country = visits.find((v) => v.country)?.country ?? null;
      return {
        visitorHash: hash,
        day: utcDayKey(lastViewedAt),
        country,
        slugs,
        views: visits.length,
        lastViewedAt,
      };
    })
    .filter((s) => s.slugs.length >= 2)
    // Most recent journey first. Previously this led with the largest
    // journey, which buried today's activity under whatever the biggest
    // reader in the range had done weeks earlier.
    .sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt))
    .slice(0, 50);

  // ---- Recent activity (latest 50, independent of the range) --------------
  const { data: recentData, error: recentError } = await client
    .from(TABLE)
    .select(
      'slug, viewed_at, country, referrer, had_access, was_locked, visitor_hash',
    )
    .eq('is_bot', false)
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
    visitorHash: r.visitor_hash as string,
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

// --------------------------------------------------------------------------
// Bot traffic (the /stats?view=bots panel). Everything getDashboardData
// filters out, grouped into the runs it actually arrived in.
// --------------------------------------------------------------------------

interface BotRow {
  slug: string;
  viewed_at: string;
  visitor_hash: string;
  country: string | null;
  user_agent: string | null;
  was_locked: boolean;
  had_access: boolean;
}

/**
 * Splits one visitor's views into separate runs. A visitor_hash covers a whole
 * UTC day, so a crawler returning from the same IP and UA three times in an
 * evening would otherwise read as one run spanning hours. Observed runs finish
 * in seconds and sit minutes-to-hours apart, so this gap separates them
 * cleanly with room to spare.
 */
const BOT_RUN_GAP_MS = 5 * 60_000;

export interface BotRun {
  visitorHash: string;
  startedAt: string;
  endedAt: string;
  /** Wall-clock span. The headline tell that this was not a reader. */
  durationMs: number;
  country: string | null;
  /** Null for rows recorded before user-agent capture existed. */
  userAgent: string | null;
  posts: number;
  views: number;
  lockedHits: number;
  /** Locked posts this run got actual content for. Non-zero is a leak. */
  lockedReads: number;
}

export interface BotAgent {
  userAgent: string | null;
  views: number;
  runs: number;
}

export interface BotData {
  days: number;
  totals: { views: number; runs: number; lockedReads: number };
  runs: BotRun[];
  agents: BotAgent[];
}

const MAX_BOT_RUNS = 100;

function toBotRun(visitorHash: string, visits: BotRow[]): BotRun {
  const startedAt = visits[0]!.viewed_at;
  const endedAt = visits[visits.length - 1]!.viewed_at;

  return {
    visitorHash,
    startedAt,
    endedAt,
    durationMs:
      new Date(endedAt).getTime() - new Date(startedAt).getTime(),
    country: visits.find((v) => v.country)?.country ?? null,
    userAgent: visits.find((v) => v.user_agent)?.user_agent ?? null,
    posts: new Set(visits.map((v) => v.slug)).size,
    views: visits.length,
    lockedHits: visits.filter((v) => v.was_locked).length,
    lockedReads: visits.filter((v) => v.was_locked && v.had_access).length,
  };
}

/** Flagged traffic for the selected range, grouped into runs and by agent. */
export async function getBotData(days: number): Promise<BotData> {
  const client = analyticsClient();

  const { data, error } = await client
    .from(TABLE)
    .select(
      'slug, viewed_at, visitor_hash, country, user_agent, was_locked, had_access',
    )
    .eq('is_bot', true)
    .gte('viewed_at', daysAgoIso(days))
    .order('viewed_at', { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;

  const rows = (data ?? []) as BotRow[];

  const byVisitor = new Map<string, BotRow[]>();
  for (const r of rows) {
    (
      byVisitor.get(r.visitor_hash) ??
      byVisitor.set(r.visitor_hash, []).get(r.visitor_hash)!
    ).push(r);
  }

  const runs: BotRun[] = [];
  for (const [hash, visits] of byVisitor) {
    // Ascending, so consecutive gaps split the day into runs in one pass.
    const ordered = [...visits].sort((a, b) =>
      a.viewed_at.localeCompare(b.viewed_at),
    );

    let current: BotRow[] = [];
    for (const r of ordered) {
      const prev = current[current.length - 1];
      const gap = prev
        ? new Date(r.viewed_at).getTime() - new Date(prev.viewed_at).getTime()
        : 0;

      if (gap > BOT_RUN_GAP_MS) {
        runs.push(toBotRun(hash, current));
        current = [];
      }
      current.push(r);
    }
    if (current.length > 0) runs.push(toBotRun(hash, current));
  }

  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const byAgent = new Map<string, { views: number; runs: number }>();
  for (const run of runs) {
    // '' stands in for "not recorded" so null can still key the map.
    const key = run.userAgent ?? '';
    const entry = byAgent.get(key) ?? { views: 0, runs: 0 };
    entry.views += run.views;
    entry.runs += 1;
    byAgent.set(key, entry);
  }

  const agents: BotAgent[] = [...byAgent.entries()]
    .map(([userAgent, stats]) => ({ userAgent: userAgent || null, ...stats }))
    .sort((a, b) => b.views - a.views);

  return {
    days,
    totals: {
      views: rows.length,
      runs: runs.length,
      lockedReads: runs.reduce((sum, r) => sum + r.lockedReads, 0),
    },
    runs: runs.slice(0, MAX_BOT_RUNS),
    agents,
  };
}
