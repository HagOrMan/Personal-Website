-- Per-post blog view analytics.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query),
-- paste the whole file, and hit Run. See BLOG_SETUP.md for the full walkthrough.
--
-- Privacy notes:
--   * No raw IP or user agent is ever stored. `visitor_hash` is a one-way
--     sha256 that mixes in a per-day salt component, so it rotates every UTC
--     day and cannot be correlated across days or reversed back to a person.
--   * Because `visitor_hash` does NOT include the slug, the same visitor gets
--     the SAME hash across every post they read on a given day. That is what
--     lets the dashboard see "one person hopped between posts A, B and C
--     today" (see the cross-post section of /stats and blog_site_daily below).

create table blog_views (
  id bigint generated always as identity primary key,
  slug text not null,
  viewed_at timestamptz not null default now(),
  visitor_hash text not null,        -- sha256(ip + user_agent + daily_salt), not reversible
  is_unique_daily boolean not null,  -- first view from this visitor_hash for this slug today
  was_locked boolean not null,       -- post was locked at time of view
  had_access boolean not null,       -- viewer saw content (unlocked/public) vs. saw password wall
  referrer text,                     -- sanitized: origin only, no paths/queries
  country text                       -- from Vercel geo header if present
);

-- Fast per-post time-ordered reads for the dashboard tables/charts.
create index blog_views_slug_time_idx on blog_views (slug, viewed_at desc);
-- Supports the "is this the first view of this slug by this visitor today?"
-- dedup lookup in recordView().
create index blog_views_dedup_idx on blog_views (slug, visitor_hash, viewed_at);
-- Supports cross-post queries: "which slugs did this visitor_hash view today?"
-- (visitor_hash is per-visitor-per-day, so grouping by it groups a person's
-- same-day journey across the whole blog).
create index blog_views_visitor_idx on blog_views (visitor_hash, viewed_at);

alter table blog_views enable row level security;
-- Deliberately create NO policies: with RLS on and zero policies, the anon and
-- authenticated roles can neither read nor write. Only the secret key (bypasses RLS)
-- used server-side can access this table.

-- RLS bypass is NOT the same as table privileges: service_role (the role the
-- secret key authenticates as) still needs explicit GRANTs to read/write, or
-- inserts fail with "permission denied for table blog_views" (SQLSTATE 42501).
-- Grant only what the analytics layer uses - a dedup SELECT and INSERT - and
-- grant nothing to anon/authenticated, so the secret key stays the only role
-- that can touch this table.
grant select, insert on table public.blog_views to service_role;

-- Per-post daily rollup used by the dashboard.
create view blog_view_daily as
  select slug,
         date_trunc('day', viewed_at) as day,
         count(*) as total_views,
         count(*) filter (where is_unique_daily) as unique_views
  from blog_views
  group by 1, 2;

-- Site-wide daily rollup. `unique_visitors` counts DISTINCT visitor_hash, so a
-- person who read three posts today counts as one visitor here (unlike summing
-- per-post unique_views, which would count them three times). This is the
-- canonical answer to "how many distinct people visited the blog on day X, and
-- did the same person show up across multiple posts?".
create view blog_site_daily as
  select date_trunc('day', viewed_at) as day,
         count(*) as total_views,
         count(distinct visitor_hash) as unique_visitors
  from blog_views
  group by 1;

-- Read access to the rollup views for the secret key (handy for ad-hoc SQL;
-- the /stats page currently aggregates from blog_views directly).
grant select on table public.blog_view_daily, public.blog_site_daily to service_role;
