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
  type CrossPostSession,
  type DailyPoint,
  type DashboardData,
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
  robots: { index: false, follow: false },
};

// Reading cookies (via the owner check) opts this into dynamic rendering.
const ALLOWED_RANGES = [7, 30, 90, 365] as const;
type Range = (typeof ALLOWED_RANGES)[number];

function parseRange(raw: string | undefined): Range {
  const n = Number(raw);
  return (ALLOWED_RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
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
            <title>
              {d.day}: {d.totalViews} views, {d.uniqueVisitors} unique visitors
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
      <div className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
        {label}
      </div>
      <div className='text-foreground mt-1 text-2xl font-bold tabular-nums'>
        {value}
      </div>
    </div>
  );
}

function RangePicker({ days }: { days: Range }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {ALLOWED_RANGES.map((r) => (
        <a
          key={r}
          href={`/stats?days=${r}`}
          className={
            r === days
              ? 'bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-medium'
              : 'border-border text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm'
          }
        >
          {r === 365 ? '1y' : `${r}d`}
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
  searchParams: Promise<{ days?: string }>;
}) {
  // Owner-only. 404 (not a login redirect) so the page never advertises itself.
  if (!(await isSupabaseOwner())) notFound();

  const { days: daysParam } = await searchParams;
  const days = parseRange(daysParam);

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-8'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h1 className='text-foreground text-3xl font-bold tracking-tight'>
              Blog analytics
            </h1>
            <p className='text-muted-foreground text-sm'>
              First-party views, owner visits excluded. Last {days} days.
            </p>
          </div>
          <RangePicker days={days} />
        </header>

        {/* Keyed on the range so switching it re-suspends: the header and
            picker stay interactive while the new window loads. */}
        <Suspense key={days} fallback={<DashboardSkeleton />}>
          <Dashboard days={days} />
        </Suspense>
      </div>
    </main>
  );
}
