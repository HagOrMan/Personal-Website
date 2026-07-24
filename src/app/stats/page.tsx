import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  type CrossPostSession,
  type DailyPoint,
  type DashboardData,
  getDashboardData,
  type PerPostStat,
  type RecentView,
} from '@/lib/blog/analytics';
import { isSupabaseOwner } from '@/lib/blog/auth';

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

/** ISO 3166-1 alpha-2 -> flag emoji, dependency-free. */
function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => A + (c.charCodeAt(0) - base)),
  );
}

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

function PerPostTable({ posts }: { posts: PerPostStat[] }) {
  if (posts.length === 0) {
    return <p className='text-muted-foreground text-sm'>No views in this range yet.</p>;
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
          {posts.map((p) => (
            <tr key={p.slug} className='border-border/60 border-b last:border-0'>
              <td className='p-3'>
                <a
                  href={`/blog/${p.slug}`}
                  className='text-foreground hover:text-primary font-medium'
                >
                  {p.slug}
                </a>
                {p.locked && (
                  <span className='text-muted-foreground ml-2 text-xs'>🔒</span>
                )}
              </td>
              <td className='p-3 text-right tabular-nums'>{p.totalViews}</td>
              <td className='p-3 text-right tabular-nums'>{p.uniqueViews}</td>
              <td className='p-3 text-right tabular-nums'>{p.views7d}</td>
              <td className='p-3 text-right tabular-nums'>{p.views30d}</td>
              <td className='text-muted-foreground p-3 text-right tabular-nums'>
                {p.locked ? `${p.wallHits} / ${p.reads}` : '—'}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrossPostSection({ sessions }: { sessions: CrossPostSession[] }) {
  return (
    <section className='flex flex-col gap-3'>
      <div>
        <h2 className='text-foreground text-lg font-semibold'>
          Same-visitor journeys
        </h2>
        <p className='text-muted-foreground text-sm'>
          One visitor who opened 2+ different posts on the same day. Grouped by
          the daily visitor hash, so it tracks a single person across the blog
          without storing anything identifying.
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
                  key={`${s.day}-${s.visitorHashShort}`}
                  className='border-border/60 border-b last:border-0'
                >
                  <td className='text-muted-foreground p-3 whitespace-nowrap'>
                    {s.day}
                  </td>
                  <td className='p-3 whitespace-nowrap'>
                    {countryFlag(s.country)}{' '}
                    <span className='text-muted-foreground font-mono text-xs'>
                      {s.visitorHashShort}
                    </span>
                  </td>
                  <td className='p-3 text-right tabular-nums'>{s.slugs.length}</td>
                  <td className='p-3 text-right tabular-nums'>{s.views}</td>
                  <td className='text-muted-foreground p-3'>
                    {s.slugs.join(', ')}
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

function RecentActivity({ recent }: { recent: RecentView[] }) {
  if (recent.length === 0) return null;
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-foreground text-lg font-semibold'>Recent activity</h2>
      <ul className='border-border divide-border/60 divide-y rounded-lg border'>
        {recent.map((r, i) => (
          <li
            key={`${r.viewedAt}-${i}`}
            className='flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm'
          >
            <span className='text-muted-foreground w-32 shrink-0 tabular-nums'>
              {fmtDateTime(r.viewedAt)}
            </span>
            <a
              href={`/blog/${r.slug}`}
              className='text-foreground hover:text-primary font-medium'
            >
              {r.slug}
            </a>
            {r.wasLocked && (
              <span className='text-muted-foreground text-xs'>
                {r.hadAccess ? 'read' : 'wall'}
              </span>
            )}
            {r.country && (
              <span className='text-muted-foreground text-xs'>
                {countryFlag(r.country)} {r.country}
              </span>
            )}
            {r.referrer && (
              <span className='text-muted-foreground truncate text-xs'>
                ← {r.referrer}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
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
  const data: DashboardData = await getDashboardData(days);

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
          <PerPostTable posts={data.perPost} />
        </section>

        <CrossPostSection sessions={data.crossPost} />

        <RecentActivity recent={data.recent} />
      </div>
    </main>
  );
}
