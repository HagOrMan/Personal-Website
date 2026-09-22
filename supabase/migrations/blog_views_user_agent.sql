-- Adds user-agent capture to blog_views.
--
-- Run this in the Supabase SQL editor on an existing install; a fresh install
-- gets everything here from blog_views.sql directly. Idempotent, so running it
-- twice is harmless.
--
-- `is_bot` flags a row whose UA matched the crawler pattern in
-- lib/blog/analytics.ts. Flagged rows are kept rather than dropped: the
-- dashboard filters them out of its numbers, and they stay queryable, so a
-- crawl can be identified by its own user agent instead of inferred from
-- request timing after the fact.

alter table public.blog_views
  add column if not exists user_agent text,
  add column if not exists is_bot boolean not null default false;

-- The dashboard reads human rows only, and one crawl can append hundreds in
-- seconds; a partial index keeps those reads off the bot rows entirely.
create index if not exists blog_views_human_time_idx
  on public.blog_views (viewed_at desc)
  where not is_bot;

-- Rollups agree with /stats rather than counting a crawl as 36 readers.
create or replace view blog_view_daily as
  select slug,
         date_trunc('day', viewed_at) as day,
         count(*) as total_views,
         count(*) filter (where is_unique_daily) as unique_views
  from blog_views
  where not is_bot
  group by 1, 2;

create or replace view blog_site_daily as
  select date_trunc('day', viewed_at) as day,
         count(*) as total_views,
         count(distinct visitor_hash) as unique_visitors
  from blog_views
  where not is_bot
  group by 1;

-- Backfill. Rows predating this migration have no user_agent, so they can only
-- be classified by behaviour: a visitor that pulled 20+ distinct posts inside a
-- minute was not reading. Deliberately a rule and not a list of known hashes,
-- so it also catches runs that were never eyeballed.
update public.blog_views
set is_bot = true
where visitor_hash in (
  select visitor_hash
  from public.blog_views
  group by visitor_hash
  having count(distinct slug) >= 20
     and max(viewed_at) - min(viewed_at) < interval '1 minute'
);
