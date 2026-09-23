-- Lets the daily cron flag bots it catches by behaviour rather than by UA.
--
-- Run this in the Supabase SQL editor on an existing install; a fresh install
-- gets the grant from blog_views.sql. Idempotent.
--
-- Column-level on purpose. service_role holds select and insert on this table
-- and deliberately nothing else (see the GRANT note in blog_views.sql), so a
-- blanket `grant update` would buy one boolean at the price of letting the
-- analytics key rewrite slugs, timestamps and visitor hashes. This grants
-- exactly the one column the sweep writes.

grant update (is_bot) on table public.blog_views to service_role;
