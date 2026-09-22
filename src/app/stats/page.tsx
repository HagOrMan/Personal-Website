import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Lock } from 'lucide-react';

import { SlugPreviewLink } from '@/components/blog/PostPreviewLink';
import {
  VisitorHoverCard,
  type VisitorJourney,
} from '@/components/stats/VisitorHoverCard';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  type BotAgent,
  type BotRun,
  type CrossPostSession,
  type DailyPoint,
  type DashboardData,
  getBotData,
  getDashboardData,
  type PerPostStat,
  type RecentView,
} from '@/lib/blog/analytics';
import { isSupabaseOwner } from '@/lib/blog/auth';
import { listPosts } from '@/lib/blog/github';
import { buildPreviewMap, type PostPreviewMap } from '@/lib/blog/preview';
import { shortHash } from '@/lib/blog/visitorHash';

// Owner-only page: never advertise its existence to search engines.
export const metadata: Metadata = {
  title: 'Stats',
  robots: { index: false, follow: false },
};

// Reading cookies (via the owner check) opts this into dynamic rendering.
const ALLOWED_RANGES = [7, 30, 90, 365] as const;
type Range = (typeof ALLOWED_RANGES)[number];
const DEFAULT_RANGE: Range = 30;

function parseRange(raw: string | undefined): Range {
  const n = Number(raw);
  return (ALLOWED_RANGES as readonly number[]).includes(n)
    ? (n as Range)
    : DEFAULT_RANGE;
}

const VIEWS = ['readers', 'bots'] as const;
type View = (typeof VIEWS)[number];
const DEFAULT_VIEW: View = 'readers';
const VIEW_LABELS: Record<View, string> = { readers: 'Readers', bots: 'Bots' };

function parseView(raw: string | undefined): View {
  return (VIEWS as readonly string[]).includes(raw ?? '')
    ? (raw as View)
    : DEFAULT_VIEW;
}

/** Defaults stay out of the query string, so bare /stats is canonical. */
function statsHref(days: Range, view: View): string {
  const params = new URLSearchParams();
  if (days !== DEFAULT_RANGE) params.set('days', String(days));
  if (view !== DEFAULT_VIEW) params.set('view', view);

  const query = params.toString();
  return query ? `/stats?${query}` : '/stats';
}

// --- formatting helpers ----------------------------------------------------

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Sub-second resolution matters here: a whole crawl fits inside one second. */
function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;

  const minutes = Math.floor(ms / 60_000);
  return `${minutes}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function fmtRate(views: number, ms: number): string {
  if (ms <= 0) return '—';
  return `${(views / (ms / 1000)).toFixed(1)}/s`;
}

// Country is rendered as the bare ISO code rather than a flag emoji: Windows
// ships no glyphs for regional-indicator pairs, so a flag renders there as a
// second, smaller copy of the same two letters sitting next to the code.

// --- tiny dependency-free charts -------------------------------------------

/** 60-day daily-unique polyline. Server-rendered inline SVG. */
function Sparkline({ data }: { data: number[] }) {
  const w = 120;
  const h = 28;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio='none'
      className='text-primary'
      role='img'
      aria-label={`Daily unique views, last ${data.length} days`}
    >
      <polyline
        points={points}
        fill='none'
        stroke='currentColor'
        strokeWidth={1.5}
        strokeLinejoin='round'
        strokeLinecap='round'
      />
    </svg>
  );
}

/** Site-wide daily bars (total views) + unique-visitor overlay line. */
function DailyChart({ data }: { data: DailyPoint[] }) {
  const w = 720;
  const h = 140;
  const pad = 4;
  const max = Math.max(1, ...data.map((d) => d.totalViews));
  const n = data.length;
  const barW = n > 0 ? (w - pad * 2) / n : 0;

  const linePoints = data
    .map((d, i) => {
      const x = pad + i * barW + barW / 2;
      const y = h - pad - (d.uniqueVisitors / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width='100%'
      viewBox={`0 0 ${w} ${h}`}
      className='overflow-visible'
      role='img'
      aria-label='Daily total views and unique visitors'
    >
      {data.map((d, i) => {
        const barH = (d.totalViews / max) * (h - pad * 2);
        return (
          <rect
            key={d.day}
            x={pad + i * barW + barW * 0.15}
            y={h - pad - barH}
            width={barW * 0.7}
            height={barH}
            className='fill-primary/30'
            rx={1}
          >
            {/* One interpolated string, not mixed text and value nodes: a
                <title> takes a single child, and the readable JSX form builds
                a 6-element array that React warns on at every render. */}
            <title>
              {`${d.day}: ${d.totalViews} views, ${d.uniqueVisitors} unique visitors`}
            </title>
          </rect>
        );
      })}
      {n > 1 && (
        <polyline
          points={linePoints}
          fill='none'
          className='stroke-primary'
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}

// --- sections --------------------------------------------------------------

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='border-border bg-card rounded-lg border p-4'>
      <div className='text-muted-foreground tracking-label text-xs font-medium uppercase'>
        {label}
      </div>
      <div className='text-foreground mt-1 text-2xl font-bold tabular-nums'>
        {value}
      </div>
    </div>
  );
}

/** Shared by both segmented controls in the header so they can't drift. */
function segmentClass(active: boolean): string {
  return active
    ? 'bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-medium'
    : 'border-border text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm';
}

function RangePicker({ days, view }: { days: Range; view: View }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {ALLOWED_RANGES.map((r) => (
        <a key={r} href={statsHref(r, view)} className={segmentClass(r === days)}>
          {r === 365 ? '1y' : `${r}d`}
        </a>
      ))}
    </div>
  );
}

function ViewPicker({ days, view }: { days: Range; view: View }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {VIEWS.map((v) => (
        <a key={v} href={statsHref(days, v)} className={segmentClass(v === view)}>
          {VIEW_LABELS[v]}
        </a>
      ))}
    </div>
  );
}

/**
 * The wall/read cell.
 *
 * `reads` counts rows with had_access, and an unlocked post always records
 * had_access: true - so once a post is unlocked that number silently becomes
 * "every view since launch" rather than "people who got past the wall". Only
 * a currently-locked post gets the ratio; a formerly-locked one keeps just
 * its wall hits, which stay meaningful as history.
 */
function WallReadCell({
  post,
  currentlyLocked,
}: {
  post: PerPostStat;
  currentlyLocked: boolean;
}) {
  if (currentlyLocked) {
    return (
      <span className='tabular-nums'>
        {post.wallHits} / {post.reads}
      </span>
    );
  }

  if (post.wasEverLocked && post.wallHits > 0) {
    return (
      <span className='flex flex-col items-end leading-tight'>
        <span className='tabular-nums'>{post.wallHits} walls</span>
        <span className='text-muted-foreground/60 text-xs'>while locked</span>
      </span>
    );
  }

  return <span>—</span>;
}

function PerPostTable({
  posts,
  previews,
}: {
  posts: PerPostStat[];
  previews: PostPreviewMap;
}) {
  if (posts.length === 0) {
    return (
      <p className='text-muted-foreground text-sm'>No views in this range yet.</p>
    );
  }
  return (
    <div className='border-border overflow-x-auto rounded-lg border'>
      <table className='w-full min-w-[720px] text-sm'>
        <thead className='text-muted-foreground border-border border-b text-left text-xs uppercase'>
          <tr>
            <th className='p-3 font-medium'>Post</th>
            <th className='p-3 text-right font-medium'>Views</th>
            <th className='p-3 text-right font-medium'>Unique</th>
            <th className='p-3 text-right font-medium'>7d</th>
            <th className='p-3 text-right font-medium'>30d</th>
            <th className='p-3 text-right font-medium'>Wall / Read</th>
            <th className='p-3 font-medium'>First</th>
            <th className='p-3 font-medium'>Last</th>
            <th className='p-3 font-medium'>60d trend</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            // Current lock state comes from the post itself; the view rows
            // only know what was true when each view happened. Slugs with no
            // live post (renamed, deleted) fall back to that history.
            const currentlyLocked = previews[p.slug]?.locked ?? p.wasEverLocked;

            return (
              <tr
                key={p.slug}
                className='border-border/60 border-b last:border-0'
              >
                <td className='p-3'>
                  <SlugPreviewLink
                    slug={p.slug}
                    preview={previews[p.slug]}
                    className='text-foreground hover:text-primary font-medium'
                  />
                  {currentlyLocked && (
                    <Lock
                      className='text-muted-foreground ml-2 inline size-3.5 align-text-bottom'
                      aria-label='Currently locked'
                    />
                  )}
                </td>
                <td className='p-3 text-right tabular-nums'>{p.totalViews}</td>
                <td className='p-3 text-right tabular-nums'>{p.uniqueViews}</td>
                <td className='p-3 text-right tabular-nums'>{p.views7d}</td>
                <td className='p-3 text-right tabular-nums'>{p.views30d}</td>
                <td className='text-muted-foreground p-3 text-right'>
                  <WallReadCell post={p} currentlyLocked={currentlyLocked} />
                </td>
                <td className='text-muted-foreground p-3 whitespace-nowrap'>
                  {fmtDate(p.firstView)}
                </td>
                <td className='text-muted-foreground p-3 whitespace-nowrap'>
                  {fmtDate(p.lastView)}
                </td>
                <td className='p-3'>
                  <Sparkline data={p.sparkline} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CrossPostSection({
  sessions,
  previews,
}: {
  sessions: CrossPostSession[];
  previews: PostPreviewMap;
}) {
  return (
    <section className='flex flex-col gap-3'>
      <div>
        <h2 className='text-foreground text-lg font-semibold'>
          Same-visitor journeys
        </h2>
        <p className='text-muted-foreground text-sm'>
          One visitor who opened 2+ different posts on the same day, most
          recent first. Grouped by the daily visitor hash, so it tracks a
          single person across the blog without storing anything identifying.
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          No multi-post visitors in this range yet.
        </p>
      ) : (
        <div className='border-border overflow-x-auto rounded-lg border'>
          <table className='w-full min-w-[560px] text-sm'>
            <thead className='text-muted-foreground border-border border-b text-left text-xs uppercase'>
              <tr>
                <th className='p-3 font-medium'>Day</th>
                <th className='p-3 font-medium'>Visitor</th>
                <th className='p-3 text-right font-medium'>Posts</th>
                <th className='p-3 text-right font-medium'>Views</th>
                <th className='p-3 font-medium'>Which posts</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={`${s.day}-${s.visitorHash}`}
                  className='border-border/60 border-b last:border-0'
                >
                  <td className='text-muted-foreground p-3 whitespace-nowrap'>
                    {s.day}
                  </td>
                  <td className='p-3 whitespace-nowrap'>
                    <span className='text-muted-foreground font-mono text-xs'>
                      {shortHash(s.visitorHash)}
                    </span>
                    {s.country && (
                      <span className='text-muted-foreground/70 ml-2 text-xs'>
                        {s.country}
                      </span>
                    )}
                  </td>
                  <td className='p-3 text-right tabular-nums'>
                    {s.slugs.length}
                  </td>
                  <td className='p-3 text-right tabular-nums'>{s.views}</td>
                  <td className='p-3'>
                    {/* Individually hoverable rather than one joined string,
                        so each post in the journey previews on its own. */}
                    <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                      {s.slugs.map((slug) => (
                        <SlugPreviewLink
                          key={slug}
                          slug={slug}
                          preview={previews[slug]}
                          className='text-muted-foreground hover:text-primary'
                        />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecentActivity({
  recent,
  journeysByVisitor,
  previews,
}: {
  recent: RecentView[];
  journeysByVisitor: Map<string, VisitorJourney>;
  previews: PostPreviewMap;
}) {
  if (recent.length === 0) return null;
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-foreground text-lg font-semibold'>Recent activity</h2>
      <p className='text-muted-foreground text-sm'>
        Latest 50 views, independent of the selected range. Rows tagged
        &ldquo;journey&rdquo; belong to a visitor who read multiple posts that
        day — hover the visitor id to see the rest of their loop. Untagged rows
        are one-off reads.
      </p>
      <ul className='border-border divide-border/60 divide-y rounded-lg border'>
        {recent.map((r, i) => {
          const journey = journeysByVisitor.get(r.visitorHash);

          return (
            <li
              key={`${r.viewedAt}-${i}`}
              className='flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm'
            >
              <span className='text-muted-foreground w-32 shrink-0 tabular-nums'>
                {fmtDateTime(r.viewedAt)}
              </span>
              <SlugPreviewLink
                slug={r.slug}
                preview={previews[r.slug]}
                className='text-foreground hover:text-primary font-medium'
              />
              {r.wasLocked && (
                <span className='text-muted-foreground text-xs'>
                  {r.hadAccess ? 'read' : 'wall'}
                </span>
              )}
              {r.country && (
                <span className='text-muted-foreground text-xs'>
                  {r.country}
                </span>
              )}

              <VisitorHoverCard
                visitorHash={r.visitorHash}
                journey={journey}
                currentSlug={r.slug}
              />
              {journey && (
                <Chip className='text-[0.65rem]'>
                  journey · {journey.posts.length} posts
                </Chip>
              )}

              {r.referrer && (
                <span className='text-muted-foreground truncate text-xs'>
                  ← {r.referrer}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --- bots ------------------------------------------------------------------

function AgentCell({ userAgent }: { userAgent: string | null }) {
  if (!userAgent) {
    return (
      <span className='text-muted-foreground/60 text-xs italic'>
        not recorded
      </span>
    );
  }

  return (
    <span
      className='text-muted-foreground block max-w-[22rem] truncate font-mono text-xs'
      title={userAgent}
    >
      {userAgent}
    </span>
  );
}

/**
 * Locked posts a run touched. `lockedReads` should always be zero — a crawler
 * holding no unlock cookie gets the password wall — so a non-zero value is a
 * leak and is called out rather than counted quietly alongside the walls.
 */
function BotLockedCell({ run }: { run: BotRun }) {
  if (run.lockedReads > 0) {
    return (
      <span className='text-destructive font-medium'>
        {run.lockedReads} read
      </span>
    );
  }

  if (run.lockedHits > 0) {
    return <span className='text-muted-foreground'>{run.lockedHits} wall</span>;
  }

  return <span className='text-muted-foreground'>—</span>;
}

function BotRunsTable({ runs }: { runs: BotRun[] }) {
  if (runs.length === 0) {
    return (
      <p className='text-muted-foreground text-sm'>
        No flagged traffic in this range.
      </p>
    );
  }

  return (
    <div className='border-border overflow-x-auto rounded-lg border'>
      <table className='w-full min-w-[860px] text-sm'>
        <thead className='text-muted-foreground border-border border-b text-left text-xs uppercase'>
          <tr>
            <th className='p-3 font-medium'>Started</th>
            <th className='p-3 font-medium'>Visitor</th>
            <th className='p-3 text-right font-medium'>Posts</th>
            <th className='p-3 text-right font-medium'>Views</th>
            <th className='p-3 text-right font-medium'>Took</th>
            <th className='p-3 text-right font-medium'>Rate</th>
            <th className='p-3 text-right font-medium'>Locked</th>
            <th className='p-3 font-medium'>Agent</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr
              key={`${r.visitorHash}-${r.startedAt}`}
              className='border-border/60 border-b last:border-0'
            >
              <td className='text-muted-foreground p-3 whitespace-nowrap tabular-nums'>
                {fmtDateTime(r.startedAt)}
              </td>
              <td className='p-3 whitespace-nowrap'>
                <span className='text-muted-foreground font-mono text-xs'>
                  {shortHash(r.visitorHash)}
                </span>
                {r.country && (
                  <span className='text-muted-foreground/70 ml-2 text-xs'>
                    {r.country}
                  </span>
                )}
              </td>
              <td className='p-3 text-right tabular-nums'>{r.posts}</td>
              <td className='p-3 text-right tabular-nums'>{r.views}</td>
              <td className='text-muted-foreground p-3 text-right whitespace-nowrap tabular-nums'>
                {fmtDuration(r.durationMs)}
              </td>
              <td className='p-3 text-right whitespace-nowrap tabular-nums'>
                {fmtRate(r.views, r.durationMs)}
              </td>
              <td className='p-3 text-right'>
                <BotLockedCell run={r} />
              </td>
              <td className='p-3'>
                <AgentCell userAgent={r.userAgent} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BotAgentsSection({ agents }: { agents: BotAgent[] }) {
  if (agents.length === 0) return null;

  return (
    <section className='flex flex-col gap-3'>
      <div>
        <h2 className='text-foreground text-lg font-semibold'>By agent</h2>
        <p className='text-muted-foreground text-sm'>
          What is actually calling. Rows recorded before user-agent capture
          existed have nothing to show here — those can only be read off their
          timing.
        </p>
      </div>
      <div className='border-border overflow-x-auto rounded-lg border'>
        <table className='w-full min-w-[560px] text-sm'>
          <thead className='text-muted-foreground border-border border-b text-left text-xs uppercase'>
            <tr>
              <th className='p-3 font-medium'>Agent</th>
              <th className='p-3 text-right font-medium'>Runs</th>
              <th className='p-3 text-right font-medium'>Views</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr
                key={a.userAgent ?? 'unrecorded'}
                className='border-border/60 border-b last:border-0'
              >
                <td className='p-3'>
                  <AgentCell userAgent={a.userAgent} />
                </td>
                <td className='p-3 text-right tabular-nums'>{a.runs}</td>
                <td className='p-3 text-right tabular-nums'>{a.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function BotsPanel({ days }: { days: Range }) {
  const data = await getBotData(days);

  return (
    <>
      <section className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        <StatTile label='Bot views' value={data.totals.views} />
        <StatTile label='Runs' value={data.totals.runs} />
        <StatTile label='Locked leaks' value={data.totals.lockedReads} />
      </section>

      <section className='flex flex-col gap-3'>
        <div>
          <h2 className='text-foreground text-lg font-semibold'>Runs</h2>
          <p className='text-muted-foreground text-sm'>
            Flagged traffic grouped into runs, newest first. A run breaks when
            the same visitor goes quiet for five minutes. Rate is the tell — a
            reader does not open a post every tenth of a second.
          </p>
        </div>
        <BotRunsTable runs={data.runs} />
      </section>

      <BotAgentsSection agents={data.agents} />
    </>
  );
}

// --- loading ---------------------------------------------------------------

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className='border-border flex flex-col gap-3 rounded-lg border p-3'>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className='h-8 w-full' />
      ))}
    </div>
  );
}

/** Mirrors the dashboard's block layout so the page doesn't jump on swap. */
function DashboardSkeleton() {
  return (
    <>
      <section className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className='h-[86px] w-full' />
        ))}
      </section>
      <Skeleton className='h-[196px] w-full' />
      <section className='flex flex-col gap-3'>
        <Skeleton className='h-6 w-24' />
        <TableSkeleton />
      </section>
      <section className='flex flex-col gap-3'>
        <Skeleton className='h-6 w-48' />
        <TableSkeleton rows={4} />
      </section>
    </>
  );
}

/** Same job for the bots panel: three tiles and one table, not four and two. */
function BotsSkeleton() {
  return (
    <>
      <section className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className='h-[86px] w-full' />
        ))}
      </section>
      <section className='flex flex-col gap-3'>
        <Skeleton className='h-6 w-24' />
        <TableSkeleton />
      </section>
    </>
  );
}

// --- page ------------------------------------------------------------------

/**
 * Post metadata for the hover previews. Deliberately failure-tolerant: the
 * dashboard's own numbers come from Supabase, so a GitHub outage should cost
 * previews (slugs render as plain text) and nothing else.
 */
async function loadPreviews(): Promise<PostPreviewMap> {
  try {
    return buildPreviewMap(await listPosts());
  } catch (err) {
    console.error('[stats] Failed to load post metadata for previews', err);
    return {};
  }
}

async function Dashboard({ days }: { days: Range }) {
  const [data, previews]: [DashboardData, PostPreviewMap] = await Promise.all([
    getDashboardData(days),
    loadPreviews(),
  ]);

  // Recent activity is the latest 50 views regardless of range, so a row can
  // belong to a visitor whose journey sits outside it - those simply find no
  // journey and render untagged. Titles are resolved here so the client card
  // never needs the post index.
  const journeysByVisitor = new Map<string, VisitorJourney>(
    data.crossPost.map((s) => [
      s.visitorHash,
      {
        day: s.day,
        country: s.country,
        views: s.views,
        posts: s.slugs.map((slug) => ({
          slug,
          title: previews[slug]?.title ?? slug,
        })),
      },
    ]),
  );

  return (
    <>
      <section className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <StatTile label='Total views' value={data.totals.totalViews} />
        <StatTile label='Unique visitors' value={data.totals.uniqueVisitors} />
        <StatTile label='Posts viewed' value={data.perPost.length} />
        <StatTile label='Multi-post visits' value={data.crossPost.length} />
      </section>

      <section className='border-border bg-card flex flex-col gap-2 rounded-lg border p-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-foreground text-lg font-semibold'>
            Daily traffic
          </h2>
          <span className='text-muted-foreground text-xs'>
            bars = views · line = unique visitors
          </span>
        </div>
        <DailyChart data={data.siteDaily} />
      </section>

      <section className='flex flex-col gap-3'>
        <h2 className='text-foreground text-lg font-semibold'>Per post</h2>
        <PerPostTable posts={data.perPost} previews={previews} />
      </section>

      <CrossPostSection sessions={data.crossPost} previews={previews} />

      <RecentActivity
        recent={data.recent}
        journeysByVisitor={journeysByVisitor}
        previews={previews}
      />
    </>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; view?: string }>;
}) {
  // Owner-only. 404 (not a login redirect) so the page never advertises itself.
  if (!(await isSupabaseOwner())) notFound();

  const { days: daysParam, view: viewParam } = await searchParams;
  const days = parseRange(daysParam);
  const view = parseView(viewParam);

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-8'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h1 className='text-foreground text-3xl font-bold tracking-tight'>
              Blog analytics
            </h1>
            <p className='text-muted-foreground text-sm'>
              {view === 'bots'
                ? `Automated traffic, excluded from the reader numbers. Last ${days} days.`
                : `First-party views, owner and bot visits excluded. Last ${days} days.`}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-4'>
            <ViewPicker days={days} view={view} />
            <RangePicker days={days} view={view} />
          </div>
        </header>

        {/* Keyed on both so switching either re-suspends: the header and
            pickers stay interactive while the new window loads. */}
        <Suspense
          key={`${view}-${days}`}
          fallback={view === 'bots' ? <BotsSkeleton /> : <DashboardSkeleton />}
        >
          {view === 'bots' ? (
            <BotsPanel days={days} />
          ) : (
            <Dashboard days={days} />
          )}
        </Suspense>
      </div>
    </main>
  );
}
