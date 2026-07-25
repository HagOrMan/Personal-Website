# Supabase Auth Guide (shared-project setup)

**Audience:** Claude Code working in one of Kyle's personal Next.js projects that
authenticates against the **shared Supabase project** (the same one
`personal-website` uses).

**What this covers:** the full authentication stack — env vars, Supabase client
factories, middleware, OAuth callback, login UI, authorization, RLS, and the
dashboard/GCP setup that has to happen outside the codebase.

**Assumed stack** (keep these roughly in sync across projects):

| Package                 | Version  |
| ----------------------- | -------- |
| `next`                  | 15.4.x   |
| `react`                 | 19.x     |
| `@supabase/ssr`         | ^0.12.0  |
| `@supabase/supabase-js` | ^2.110.0 |
| `tailwindcss`           | ^4.1.x   |
| `typescript`            | ^5.8.x   |

App Router only. Path alias `@/*` -> `./src/*`. Prettier: single quotes, JSX
single quotes, 2-space, semicolons. ESLint uses `simple-import-sort` with the
group order **react/next -> npm packages -> `@/` -> relative -> css -> side-effect**,
which is why `import 'server-only';` sits at the **bottom** of files in these
repos, not the top. Match that.

---

## Table of contents

- [Supabase Auth Guide (shared-project setup)](#supabase-auth-guide-shared-project-setup)
  - [Table of contents](#table-of-contents)
  - [1. The model](#1-the-model)
  - [2. Environment variables](#2-environment-variables)
    - [Key naming: `SUPABASE_SECRET_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`](#key-naming-supabase_secret_key-vs-supabase_service_role_key)
    - [`requireEnv` helper](#requireenv-helper)
    - [Vercel](#vercel)
  - [3. Supabase dashboard setup](#3-supabase-dashboard-setup)
    - [Site URL](#site-url)
    - [Redirect URLs — the critical step](#redirect-urls--the-critical-step)
    - [Provider](#provider)
    - [Email (only if using magic links)](#email-only-if-using-magic-links)
  - [4. Google OAuth setup (GCP)](#4-google-oauth-setup-gcp)
    - [One-time GCP steps](#one-time-gcp-steps)
    - [Consent-screen caveat](#consent-screen-caveat)
  - [5. Code: the client factories](#5-code-the-client-factories)
    - [`src/lib/supabase/server.ts` — always needed](#srclibsupabaseserverts--always-needed)
    - [`src/lib/supabase/client.ts` — only if client components query Supabase](#srclibsupabaseclientts--only-if-client-components-query-supabase)
    - [`src/lib/supabase/service.ts` — only for RLS-bypassing writes](#srclibsupabaseservicets--only-for-rls-bypassing-writes)
    - [`src/types/database.ts` — generated types](#srctypesdatabasets--generated-types)
  - [6. Code: middleware](#6-code-middleware)
    - [`src/lib/supabase/middleware.ts`](#srclibsupabasemiddlewarets)
    - [`src/middleware.ts`](#srcmiddlewarets)
    - [Middleware is not a security boundary](#middleware-is-not-a-security-boundary)
  - [7. Code: sign-in / sign-out actions](#7-code-sign-in--sign-out-actions)
    - [Optional: magic link](#optional-magic-link)
  - [8. Code: the OAuth callback route](#8-code-the-oauth-callback-route)
  - [9. Code: login page and buttons](#9-code-login-page-and-buttons)
  - [10. Authorization (who is allowed in)](#10-authorization-who-is-allowed-in)
    - [You probably have more than one identity](#you-probably-have-more-than-one-identity)
    - [Rules](#rules)
    - [Why an env allowlist rather than a roles table](#why-an-env-allowlist-rather-than-a-roles-table)
  - [11. Database tables and RLS](#11-database-tables-and-rls)
    - [Naming](#naming)
    - [RLS is mandatory](#rls-is-mandatory)
    - [Pattern A: server-only table (no client access at all)](#pattern-a-server-only-table-no-client-access-at-all)
    - [Pattern B: owner-readable table](#pattern-b-owner-readable-table)
    - [Migrations](#migrations)
  - [12. Gotchas that have actually bitten this stack](#12-gotchas-that-have-actually-bitten-this-stack)
  - [13. New-app checklist](#13-new-app-checklist)
  - [Appendix A: direct Google API OAuth (calendar etc.)](#appendix-a-direct-google-api-oauth-calendar-etc)
  - [Appendix B: adding Google to a project that already uses GitHub](#appendix-b-adding-google-to-a-project-that-already-uses-github)

---

## 1. The model

There are **two Supabase projects** total (free-plan limit). One holds
lower-sensitivity data, the other holds sensitive data (people's emails,
calendar keys) so a leaked key from one can't reach the other. This guide is
about apps sharing **one** of them — specifically the same project
`personal-website` uses.

Consequences of sharing a project that you must internalize:

**One `auth.users` pool.** Every app on this project sees the same users table.
If you sign in to app A with `you@gmail.com`, app B sees the _same user UUID_.
That's convenient (one owner allowlist value works everywhere) and dangerous
(anyone who can sign in to _any_ app on this project gets an `auth.users` row
that is valid at _every_ app on this project). Authentication is shared;
**authorization must be enforced per-app**. See §10.

**One provider configuration per provider.** Supabase stores exactly one Google
client ID/secret for the whole project. You **cannot** give each app its own
Google OAuth client while sharing a Supabase project — and you don't need to.
One GCP OAuth client, whose only redirect URI is the Supabase callback, serves
every app. See §4.

**Providers are not exclusive.** GitHub and Google can both be enabled at the
same time on the same project. `personal-website` keeps GitHub; new apps use
Google. Nothing has to be migrated. If the same verified email signs in through
both providers, Supabase links them into one user with one UUID (automatic
identity linking for verified emails), so the owner allowlist keeps working.

**One `public` schema.** Prefix every table with the app name:
`blog_views`, `contact_submissions`, `chess_games`, `budget_entries`. See §11.

**Shared auth rate limits.** Magic-link/OTP email limits are **per Supabase
project**, not per app. All apps draw from the same small hourly quota on the
built-in SMTP. If several apps rely on magic links, configure custom SMTP
(Resend is already in the stack) or lean on OAuth.

**Free tier auto-pauses on inactivity.** The shared project is kept alive by
`personal-website`'s daily Vercel cron (`/api/cron/keep-alive`). A new app does
**not** need its own keep-alive cron — one per project is enough. Don't add a
second.

---

## 2. Environment variables

Add to `.env.example` (committed, values blank) and `.env.local` (gitignored):

```bash
# --- Supabase (shared project) ----------------------------------------------
# Safe to expose to the browser - these are the public project URL and
# publishable/anon key, not secrets. Supabase dashboard -> Project Settings ->
# API. RLS is what actually protects data, not the secrecy of this key.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only. Bypasses RLS entirely. NEVER prefix NEXT_PUBLIC_, never import
# into a client component. Only needed if this app writes rows that no
# authenticated user should be able to touch (analytics, audit logs, cron jobs).
SUPABASE_SECRET_KEY=

# Comma-separated Supabase auth user UUIDs allowed to use this app. There is no
# roles table - this list is the sole authorization source. See guides/auth.md
# section 10. Bootstrap it by signing in once and copying the ID off /login.
OWNER_USER_IDS=

# Public origin of this app, used to build OAuth redirect URLs in local dev
# where forwarded headers are absent.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Key naming: `SUPABASE_SECRET_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`

Supabase introduced new-style API keys (`sb_publishable_…` / `sb_secret_…`) that
replace the legacy JWT `anon` / `service_role` keys. Both still work. Existing
projects here are inconsistent — `personal-website` uses `SUPABASE_SECRET_KEY`,
the other project uses `SUPABASE_SERVICE_ROLE_KEY` — they mean the same thing.

**For new apps use `SUPABASE_SECRET_KEY`** and prefer the new-style secret key
from the dashboard. It's revocable independently, which the legacy service_role
JWT is not. Whatever you pick, the variable name must match what the code reads.

The new-style keys map to the same Postgres roles as the legacy ones —
`sb_publishable_…` authenticates as `anon`, `sb_secret_…` as `service_role`. Only
the key format and revocability changed, so `grant … to service_role` (§11) is
still the correct grant target either way.

### `requireEnv` helper

Don't scatter `process.env.X!` non-null assertions. Create `src/lib/env.ts`:

```ts
/**
 * Reads a required env var, failing loudly at the call site instead of
 * letting `undefined` reach the Supabase client and surface as an opaque
 * "Invalid URL" or 401 much later.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
```

> Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only for **statically
> analyzable** member access. `process.env[name]` with a dynamic key works on the
> server but is `undefined` in the browser bundle. `requireEnv` is therefore
> **server-safe only**. In the browser client (§5) read the vars directly:
> `process.env.NEXT_PUBLIC_SUPABASE_URL!`. `personal-website` sidesteps this with
> a `supabaseEnv()` helper that uses static member access — either approach is
> fine, just don't use a dynamic key in client code.

### Vercel

Every var above must also be set in **Vercel -> Project Settings -> Environment
Variables** for Production, Preview, and Development. `.env.local` is local only.

---

## 3. Supabase dashboard setup

Done once per **app**, in the shared project. Dashboard ->
**Authentication -> URL Configuration**.

### Site URL

There is exactly one Site URL for the whole project, and it already belongs to
whichever app claimed it. **Do not change it.** It is only the fallback used when
a redirect isn't in the allowlist.

### Redirect URLs — the critical step

Add every origin this app will redirect back to:

```
https://<this-app>.kylehagerman.dev/auth/callback
https://<this-app>.vercel.app/auth/callback
https://*-<your-vercel-scope>.vercel.app/auth/callback   # preview deploys
http://localhost:3000/auth/callback
```

**Footgun:** if a redirect URL is not in this allowlist, Supabase silently falls
back to the project's Site URL. Since that Site URL belongs to a _different app_,
a missing entry means your users finish signing in on someone else's site. If
sign-in "works" but lands on the wrong domain, this is always why.

Wildcards are supported for the preview-deploy pattern (`*` matches one path
segment, `**` matches across segments).

### Provider

**Authentication -> Providers -> Google** — should already be enabled from the
first app that set it up. If it isn't, see §4. Nothing app-specific goes here;
it's project-wide.

### Email (only if using magic links)

**Authentication -> Emails**. Built-in SMTP is rate limited per project and
shared across all apps. Configure custom SMTP via Resend if magic links matter.

---

## 4. Google OAuth setup (GCP)

**Do this once for the whole Supabase project, not once per app.**

Supabase stores one Google client ID/secret per project. Every app that signs in
through this Supabase project uses that single credential. A second GCP OAuth
client is only needed for the _other_ Supabase project, or for direct Google API
access (Appendix A).

### One-time GCP steps

1. **console.cloud.google.com** -> create/select the project used for Supabase
   OAuth (GCP holds the real OAuth config).

2. **Google Auth Platform -> Branding / Audience** (formerly "OAuth consent
   screen"):
   - User type: **External**
   - App name, support email, developer contact — this text is what shows on the
     consent screen for **every** app on the project, so keep it generic
     ("Kyle Hagerman"), not app-specific.
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
     These are non-sensitive and need no verification review.

3. **Publish the app** (Audience -> "Publish app" / In production). While in
   _Testing_, only listed test users can sign in **and Google-issued refresh
   tokens expire after 7 days**. With only the three non-sensitive scopes above,
   publishing requires no Google review.

4. **Credentials -> Create Credentials -> OAuth client ID -> Web application**:
   - **Authorized redirect URIs** — exactly one entry:
     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```
     Your app's own `/auth/callback` does **not** go here. Google redirects to
     Supabase; Supabase redirects to your app. Your app's URL goes in the
     Supabase redirect allowlist (§3).
   - Authorized JavaScript origins: not needed for this server-side flow.

5. Copy the **Client ID** and **Client Secret** into Supabase Dashboard ->
   **Authentication -> Providers -> Google** -> enable -> paste -> Save.

### Consent-screen caveat

Users see the GCP project's app name and `<project-ref>.supabase.co` as the
destination, identical across all apps on this Supabase project. Fixing that
requires a Supabase custom auth domain (paid). For owner-only tools, ignore it.

---

## 5. Code: the client factories

Four files under `src/lib/supabase/`. Create only the ones the app actually
needs — an app with no client-side Supabase calls should not have `client.ts`,
and an app with no RLS-bypassing writes should not have `service.ts`.

### `src/lib/supabase/server.ts` — always needed

```ts
import { cookies } from 'next/headers';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cache } from 'react';

import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database';

import 'server-only';

/**
 * Cookie-based Supabase client for Server Components, Server Actions, and
 * Route Handlers. Anon key + the caller's session cookie, so RLS still
 * applies - this is NOT an admin client.
 *
 * `cache()`-wrapped so every call within a single request returns the same
 * client/session instead of each independently re-reading cookies and racing
 * to refresh. Without this, a page whose Server Components fire many
 * concurrent queries can trigger a thundering herd of simultaneous
 * refresh-token redemptions against the same near-expiry token, which
 * surfaces as PostgREST rejecting the resulting access token with
 * `PGRST303: "JWT issued at future"` - a refresh race, not a clock problem.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render, which can't set
            // cookies - middleware persists the refreshed session on the
            // next request instead.
          }
        },
      },
    },
  );
});
```

The empty `catch` is **required**, not sloppy. Server Components may not mutate
cookies; without the swallow, any Server Component that happens to trigger a
token refresh throws mid-render.

### `src/lib/supabase/client.ts` — only if client components query Supabase

```ts
import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

/**
 * Browser client, anon key only. Safe to import from client components.
 * RLS is what enforces that only permitted rows are ever returned.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

Static `process.env.X` member access here, not `requireEnv` — see §2.

### `src/lib/supabase/service.ts` — only for RLS-bypassing writes

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database';

import 'server-only';

/**
 * Service-role client. Bypasses RLS entirely - must only ever be imported by
 * trusted server-only entry points (cron routes, analytics recording). The
 * `server-only` import turns any transitive client-component import into a
 * build error.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

`persistSession: false` matters: without it the service client tries to write
session state and can collide with the real user session.

### `src/types/database.ts` — generated types

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.ts
```

Because the schema is shared, this emits **every app's tables**, not just yours.
That's noise, not a leak (table names only, no data). Either accept it or hand-trim
to your prefix — but if you trim, re-trim after every regeneration. Accepting the
full file is less error-prone.

If you skip generated types, drop the `<Database>` generic everywhere rather than
leaving a broken import.

---

## 6. Code: middleware

Two files. Middleware does two jobs: refresh the session cookie on every request,
and redirect unauthenticated users away from protected routes.

### `src/lib/supabase/middleware.ts`

For an owner-only app, **deny by default** — list what's public rather than what's
protected, so a new route is protected the moment it exists.

```ts
import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import { requireEnv } from '@/lib/env';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/cron'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

type CookieWrite = { name: string; value: string; options: CookieOptions };

/**
 * Process-wide single-flight for the getUser() call below, keyed by the
 * request's raw Cookie header. Without it, two requests arriving with the
 * same near-expiry session (a page load plus a client component's own fetch)
 * can each redeem the same refresh token at once. One redemption wins; the
 * loser ends up with a mismatched access/refresh pair, which PostgREST
 * rejects as `PGRST303: "JWT issued at future"`. Same class of bug that
 * server.ts's cache() fixes within a request, one layer up across requests.
 *
 * Only the first request for a given cookie snapshot calls Supabase;
 * concurrent requests with byte-identical cookies await and reuse its result.
 * A different cookie snapshot (different tab, no session) gets its own
 * flight, so session state is never shared across different sessions.
 *
 * In-process only - resets on cold start, doesn't coordinate across
 * instances. Fine for a personal app, not a distributed lock.
 */
const inFlightByCookieKey = new Map<
  string,
  Promise<{ user: User | null; cookieWrites: CookieWrite[] }>
>();

async function getUserSingleFlight(request: NextRequest) {
  const key = request.headers.get('cookie') ?? '';
  const existing = inFlightByCookieKey.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const cookieWrites: CookieWrite[] = [];
    const supabase = createServerClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieWrite[]) {
            cookieWrites.push(...cookiesToSet);
          },
        },
      },
    );

    // getUser() revalidates the token against the Supabase Auth server,
    // unlike getSession() which just reads the (possibly stale, possibly
    // forged) cookie. Removing this call silently expires sessions.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { user, cookieWrites };
  })();

  inFlightByCookieKey.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightByCookieKey.delete(key);
  }
}

export async function updateSession(request: NextRequest) {
  // Rebuilt on each call (not hoisted) so it reflects request.cookies as of
  // that moment - mutated below once we know whether there are writes.
  function nextResponse() {
    return NextResponse.next({
      request: { headers: new Headers(request.headers) },
    });
  }

  const { user, cookieWrites } = await getUserSingleFlight(request);

  let response = nextResponse();
  if (cookieWrites.length > 0) {
    cookieWrites.forEach(({ name, value }) => request.cookies.set(name, value));
    response = nextResponse();
    cookieWrites.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
  }

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
```

The single-flight map is worth including from day one. It is cheap, and the bug
it prevents (`PGRST303`) is extremely confusing to debug — it reads like a server
clock problem and isn't.

### `src/middleware.ts`

```ts
import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth checks are
     * deny-by-default, so a new route is protected the moment it exists;
     * PUBLIC_PATHS in lib/supabase/middleware.ts is the opt-out list.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)',
  ],
};
```

An app that's mostly public (like `personal-website`) instead enumerates only the
routes that need a session:

```ts
export const config = {
  matcher: ['/blog/:path*', '/login', '/auth/:path*', '/stats'],
};
```

Pick one model deliberately. Owner-only tool -> deny by default. Public site with
a couple of gated pages -> enumerate.

### Middleware is not a security boundary

Middleware protects _navigation_. It does not run in front of Server Actions the
way you'd expect, and route handlers can be hit directly. **Every server action
and route handler that reads or mutates data must re-check auth itself.** That's
what `requireUser()` in §10 is for. Treat middleware as UX (redirect to login),
not as enforcement.

---

## 7. Code: sign-in / sign-out actions

`src/lib/supabase/actions.ts`:

```ts
'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { sanitizeNextPath } from '@/lib/auth';
import { requireEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * The origin this app is actually being served from. Uses forwarded headers
 * so it's correct on Vercel preview deploys, where the origin differs from
 * both localhost and the production domain, and falls back to the configured
 * site URL locally.
 */
async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (!host) return requireEnv('NEXT_PUBLIC_SITE_URL');
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  return `${protocol}://${host}`;
}

export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = await createClient();
  const callback = new URL('/auth/callback', await siteOrigin());
  if (next) callback.searchParams.set('next', sanitizeNextPath(next));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.toString(),
      // Forces Google to re-issue a refresh token rather than silently
      // reusing a prior grant. Drop `prompt` if you find the account
      // chooser annoying and only ever use one Google account.
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  if (error || !data.url) redirect('/login?error=auth');

  // signInWithOAuth() doesn't attach the API key to the authorize URL, and
  // this redirect is a full browser navigation (no custom headers), so
  // Supabase's gateway rejects it with "No API key found" unless it's added
  // here as a query param. The anon key is public (NEXT_PUBLIC_*) and already
  // ships in the client bundle, so this adds no exposure.
  const authorizeUrl = new URL(data.url);
  authorizeUrl.searchParams.set(
    'apikey',
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
  redirect(authorizeUrl.toString());
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

> The `apikey` query-param workaround is the single most time-wasting issue in
> this stack. If OAuth dies with **"No API key found in request"**, this is it.
> Keep the comment — it looks removable and isn't.

`redirect()` works by throwing, so it must be called **outside** any `try`/`catch`
that swallows errors, and nothing after it runs.

### Optional: magic link

Useful as a fallback when a Google account isn't handy. Remember the shared
project-wide email rate limit (§1).

```ts
export interface MagicLinkResult {
  success?: boolean;
  message?: string;
}

export async function signInWithMagicLink(
  _prevState: MagicLinkResult | undefined,
  formData: FormData,
): Promise<MagicLinkResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { message: 'Enter a valid email address.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });

  // Deliberately generic: a provider-specific error would let someone probe
  // which addresses exist.
  if (error) return { message: 'Could not send magic link. Please try again.' };
  return { success: true, message: 'Check your email for a sign-in link.' };
}
```

For an owner-only app, also set **Authentication -> Providers -> Email ->
"Allow new users to sign up" = off** in the dashboard, so magic links can only be
sent to already-existing users. Note this is a **project-wide** setting shared by
every app — check with the other apps before flipping it.

---

## 8. Code: the OAuth callback route

`src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { sanitizeNextPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

This route **must** be in `PUBLIC_PATHS` — the user has no session yet when they
hit it. `@supabase/ssr` uses the PKCE flow by default, so the code verifier lives
in a cookie set at sign-in start and `exchangeCodeForSession` reads it here. This
is why sign-in must start and finish on the **same origin**: starting on
`localhost:3000` and finishing on a preview URL loses the verifier and fails with
"invalid request: both auth code and code verifier should be non-empty".

---

## 9. Code: login page and buttons

`src/app/login/page.tsx` — server component. It doubles as the bootstrap tool:
it prints your user UUID so you can paste it into `OWNER_USER_IDS`.

```tsx
import type { Metadata } from 'next';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Login',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sign-in itself never depends on this - it only gates access in
  // lib/auth.ts. Surfacing the ID here is how you bootstrap the list.
  const hasOwnersConfigured = Boolean(process.env.OWNER_USER_IDS?.trim());

  return (
    <main className='bg-background page-shell'>
      <div className='mx-auto flex w-full max-w-sm flex-col gap-6'>
        <h1 className='text-foreground text-3xl font-bold tracking-tight'>
          {user ? 'Signed in' : 'Sign in'}
        </h1>

        {user ? (
          <div className='flex flex-col gap-4'>
            <p className='text-muted-foreground text-sm'>
              Signed in as {user.email ?? user.id}
            </p>

            <div className='flex flex-col gap-1'>
              <span className='text-muted-foreground text-xs'>
                Your user ID
              </span>
              <code className='border-border bg-muted text-foreground select-all break-all rounded-md border px-3 py-2 text-xs'>
                {user.id}
              </code>
            </div>

            {!hasOwnersConfigured && (
              <p className='text-muted-foreground text-sm'>
                No <code className='text-foreground'>OWNER_USER_IDS</code>{' '}
                configured yet — copy the ID above into that environment
                variable to grant access.
              </p>
            )}

            <SignOutButton />
          </div>
        ) : (
          <GoogleSignInButton />
        )}
      </div>
    </main>
  );
}
```

`src/components/auth/GoogleSignInButton.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/Button';
import { signInWithGoogle } from '@/lib/supabase/actions';

import GoogleIcon from '../icons/GoogleIcon';

export function GoogleSignInButton({ next }: { next?: string }) {
  return (
    <Button
      variant='outline'
      className='w-fit gap-2'
      onClick={() => signInWithGoogle(next)}
    >
      <GoogleIcon className='size-4' />
      Continue with Google
    </Button>
  );
}
```

`src/components/auth/SignOutButton.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/supabase/actions';

export function SignOutButton() {
  return (
    <Button variant='outline' className='w-fit' onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
```

Always set `robots: { index: false, follow: false }` on the login page and on any
owner-only page.

---

## 10. Authorization (who is allowed in)

**Authentication says who someone is. It does not say they may use this app.**
Because `auth.users` is shared, a successful Google sign-in only proves the person
has a Google account — every app on this project would accept the resulting
session. Authorization is per-app and is your job.

For owner-only apps the model is an **environment-variable allowlist of user
UUIDs**. No roles table, nothing in the database. The allowlist lives in this
app's Vercel env, so it is inherently app-scoped: adding a user to app B grants
nothing in app A.

`src/lib/auth.ts`:

```ts
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import 'server-only';

/**
 * Same-site path guard shared by the login action and the OAuth callback.
 * "//host" is a protocol-relative URL and "/\" is treated like "//" by
 * browsers - either would turn a post-login redirect into an open redirect
 * to an attacker-chosen site.
 */
export function sanitizeNextPath(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : '/';
}

function ownerIds(): string[] {
  return (process.env.OWNER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * True when the signed-in Supabase user is in this app's allowlist. This is
 * the sole authorization source - auth.users is shared across every app on
 * this Supabase project, so a valid session proves identity, not access.
 */
export async function isOwner(): Promise<boolean> {
  const allowed = ownerIds();
  if (allowed.length === 0) return false; // fail closed

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user && allowed.includes(user.id));
}

/**
 * Server actions and route handlers run independent of middleware, so each
 * one that reads or mutates data re-checks auth itself rather than trusting
 * the request ever passed through route middleware.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!ownerIds().includes(user.id)) redirect('/login?error=forbidden');

  return user;
}
```

### You probably have more than one identity

Supabase links accounts into one user only when the provider emails match and are
verified. Kyle's GitHub and Google accounts use **different** emails, so they are
two separate `auth.users` rows with two different UUIDs.

This is fine and needs no fixing — `OWNER_USER_IDS` is a list. Put every UUID you
sign in with in it:

```bash
OWNER_USER_IDS=<uuid-from-github>,<uuid-from-google>
```

The one place it matters is **per-user RLS** (Pattern B in §11): a row written
while signed in as one identity is invisible to the other, silently, with no
error. Owner-only apps avoid this entirely by using the env allowlist plus
server-only tables (Pattern A). If an app genuinely needs `auth.uid() = user_id`
scoping _and_ you sign in through both providers, either always use one provider
for that app, or merge the identities with `supabase.auth.linkIdentity()` (needs
manual linking enabled in the dashboard) so there is only one UUID.

Never assume which UUID you have — sign in and read it off `/login`.

### Rules

- **Every** server action and route handler that touches data starts with
  `await requireUser()`. No exceptions for "it's just a read".
- Empty allowlist means **deny everyone**. Never default to allow.
- For pages that shouldn't advertise their existence, `notFound()` rather than
  redirecting to login — `personal-website`'s `/stats` does this.
- Always `getUser()`, never `getSession()`, on the server. `getSession()` returns
  unverified cookie contents.

### Why an env allowlist rather than a roles table

The allowlist is per-app by construction, requires no shared table in a schema
other apps can see, can't be modified by a SQL injection, and needs no migration.
The cost is a redeploy to change it — irrelevant for a one-user tool. If an app
ever grows real multi-user access, move to a prefixed `<app>_members` table with
RLS, and keep the env allowlist as the bootstrap admin.

---

## 11. Database tables and RLS

### Naming

Prefix every table, view, function, and index with the app name. The schema is
shared and unprefixed names will collide.

```sql
create table chess_games (...);
create index chess_games_player_idx on chess_games (player_id);
create view chess_daily_stats as ...;
```

### RLS is mandatory

Every table gets `enable row level security`. Without it, the anon key — which
ships in the browser bundle of **every app on this project** — can read your
table. This is not theoretical: the anon key is public by design.

### Pattern A: server-only table (no client access at all)

RLS on, **zero policies**. Anon and authenticated can neither read nor write; only
the secret key reaches it. This is what `blog_views` does.

```sql
create table myapp_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

alter table myapp_events enable row level security;
-- Deliberately NO policies: RLS on + zero policies = anon and authenticated
-- can neither read nor write. Only the secret key (bypasses RLS) can touch it.

-- RLS bypass is NOT the same as table privileges. service_role still needs
-- explicit GRANTs or inserts fail with "permission denied for table"
-- (SQLSTATE 42501). Grant only what the app uses, and nothing to
-- anon/authenticated.
grant select, insert on table public.myapp_events to service_role;
```

RLS and table privileges are **independent gates**, and conflating them causes
confusion in both directions:

- **Privileges** (`GRANT`) — Supabase sets default privileges on `public`, so
  `anon` and `authenticated` usually _do_ pick up privileges on a new table
  automatically. That's expected and harmless.
- **RLS** — with RLS on and zero policies, `anon` and `authenticated` are blocked
  anyway, whatever privileges they hold. `service_role` bypasses RLS entirely but
  still needs the privilege.

So a Pattern A table is protected by gate 2, not by withholding gate 1. The
explicit `grant … to service_role` is still worth writing: default privileges
attach to the _creating_ role, so a table created through a different path
doesn't inherit them and inserts fail with `42501`.

### Pattern B: owner-readable table

When the app queries with the user's session (not the secret key), the allowlist
lives in env and the database doesn't know about it. Scope rows by `user_id`:

```sql
create table myapp_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  body text not null
);

alter table myapp_notes enable row level security;

create policy myapp_notes_select_own on myapp_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy myapp_notes_insert_own on myapp_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy myapp_notes_update_own on myapp_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy myapp_notes_delete_own on myapp_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Index the RLS column - every policy check filters on it.
create index myapp_notes_user_idx on myapp_notes (user_id, created_at desc);
```

Two things that matter here:

- `to authenticated` — without a role restriction the policy is also evaluated for
  `anon` on every request, for nothing.
- `(select auth.uid())` rather than bare `auth.uid()` — wrapping in a subselect
  lets Postgres evaluate it once per query instead of once per row. On a table of
  any size this is the difference between a seq scan and an index scan.

Note this still leaves _any_ signed-in user able to create their own rows in your
app's table, since `authenticated` spans all apps. If that matters, add the owner
UUID to the policy directly:

```sql
create policy myapp_notes_owner_only on myapp_notes
  for all to authenticated
  using ((select auth.uid()) = '00000000-0000-0000-0000-000000000000'::uuid);
```

...at the cost of a migration whenever it changes. For owner-only tools, Pattern A
plus the service client avoids the whole question and is usually the better call.

### Migrations

Keep them in `supabase/migrations/*.sql`, one file per feature, with a header
comment saying what it does and how to run it (Dashboard -> SQL Editor -> New
query -> paste -> Run). They are documentation as much as code — see
`supabase/migrations/blog_views.sql` in `personal-website` for the house style.

---

## 12. Gotchas that have actually bitten this stack

| Symptom                                                                   | Cause                                                                                                                        | Fix                                                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `No API key found in request` during OAuth redirect                       | `signInWithOAuth()` doesn't attach the anon key to the authorize URL, and a browser navigation carries no headers            | Append `?apikey=<anon key>` to `data.url` before redirecting (§7)                  |
| Sign-in completes on the **wrong site**                                   | The redirect URL isn't in the Supabase allowlist, so it fell back to the project-wide Site URL, which belongs to another app | Add this app's `/auth/callback` to Redirect URLs (§3)                              |
| `PGRST303: JWT issued at future`                                          | Concurrent refresh-token redemptions racing; one wins, others get a mismatched pair. Not a clock problem                     | `cache()` in `server.ts` + single-flight in middleware (§5, §6)                    |
| Session silently expires after ~1h                                        | `getUser()` removed from middleware, or the route isn't in the matcher                                                       | Keep the `getUser()` call; check `config.matcher`                                  |
| `Error: Cookies can only be modified in a Server Action or Route Handler` | A Server Component render triggered a token refresh                                                                          | The empty `catch` in `setAll` (§5) — middleware persists it next request           |
| `both auth code and code verifier should be non-empty`                    | PKCE verifier cookie missing — sign-in started on a different origin than it finished on                                     | Start and finish on the same origin; check `siteOrigin()`                          |
| `permission denied for table X` (42501) with the secret key               | RLS bypass ≠ table privileges                                                                                                | `grant select, insert on table public.X to service_role;` (§11)                    |
| Google re-consent every login, or refresh token expires after 7 days      | GCP consent screen still in _Testing_                                                                                        | Publish the app (§4)                                                               |
| Magic link emails stop sending                                            | Project-wide email rate limit, shared with the other apps                                                                    | Custom SMTP via Resend, or use OAuth                                               |
| Supabase project paused                                                   | Free-tier inactivity                                                                                                         | Already handled by `personal-website`'s daily cron — don't add a second            |
| Auth works locally, 401s on Vercel                                        | Env vars set in `.env.local` only                                                                                            | Set them in Vercel -> Settings -> Environment Variables for all three environments |

---

## 13. New-app checklist

Dashboard / GCP (no code):

- [ ] Add this app's `/auth/callback` URLs (prod, vercel.app, preview wildcard,
      localhost) to Supabase -> Authentication -> URL Configuration -> Redirect URLs
- [ ] Confirm Google provider is enabled on the project (§4) — do **not** create a
      new GCP OAuth client for it
- [ ] Do **not** change the project's Site URL
- [ ] Do **not** add a second keep-alive cron

Env:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SECRET_KEY` (only if the app needs RLS-bypassing writes)
- [ ] `OWNER_USER_IDS` (blank at first; filled after the first sign-in)
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] All of the above mirrored into Vercel for Production/Preview/Development

Code:

- [ ] `src/lib/env.ts` — `requireEnv`
- [ ] `src/lib/supabase/server.ts` — `cache()`-wrapped, `server-only`
- [ ] `src/lib/supabase/client.ts` — only if client components query Supabase
- [ ] `src/lib/supabase/service.ts` — only if RLS-bypassing writes are needed
- [ ] `src/lib/supabase/middleware.ts` + `src/middleware.ts`
- [ ] `src/lib/supabase/actions.ts` — `signInWithGoogle`, `signOut`
- [ ] `src/app/auth/callback/route.ts`
- [ ] `src/app/login/page.tsx` + `GoogleSignInButton` / `SignOutButton`
- [ ] `src/lib/auth.ts` — `isOwner`, `requireUser`, `sanitizeNextPath`
- [ ] `src/types/database.ts` — generated types
- [ ] Every table prefixed, RLS enabled, `service_role` grants written
- [ ] Every server action and route handler starts with `await requireUser()`

Bootstrap:

- [ ] Deploy, visit `/login`, sign in with Google
- [ ] Copy the printed UUID into `OWNER_USER_IDS`, redeploy
- [ ] Verify a protected route 302s to `/login` in a private window
- [ ] Verify sign-out clears the session

---

## Appendix A: direct Google API OAuth (calendar etc.)

This is a **separate system** from Supabase sign-in and is easy to confuse with
it. These env vars —

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
# 32-byte key, base64-encoded, for AES-256-GCM encryption of refresh tokens.
# Generate with: openssl rand -base64 32
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

— have nothing to do with logging into the app. They belong to a second OAuth
flow where **your app** (not Supabase) is the OAuth client, requesting scopes like
Calendar or Gmail, and storing the resulting refresh token itself.

Telltale difference: `GOOGLE_REDIRECT_URI` points at **your app's** route
(`/api/google/callback`), whereas Supabase sign-in redirects to
`https://<ref>.supabase.co/auth/v1/callback`.

Only add this when the app must call Google APIs on your behalf. Signing in with
Google does **not** require it.

Rules when you do need it:

- **Its own GCP OAuth client**, separate from the Supabase one, per app. Redirect
  URI is the app's own route. This is the one case where per-app OAuth clients
  genuinely apply.
- Sensitive scopes (Calendar, Gmail) may require Google verification. Keeping the
  consent screen in Testing with yourself as the only test user avoids review but
  expires refresh tokens after 7 days.
- Refresh tokens are long-lived credentials. **Encrypt at rest** (AES-256-GCM with
  `GOOGLE_TOKEN_ENCRYPTION_KEY`), store in a server-only table using Pattern A
  from §11, and only ever read them via the service client.
- Per `WEBSITES.md`, calendar keys count as sensitive — that app belongs on the
  **other** Supabase project, not this one.
- `access_type: 'offline'` + `prompt: 'consent'` are required to get a refresh
  token; Google returns one only on first grant otherwise.

---

## Appendix B: adding Google to a project that already uses GitHub

`personal-website` uses GitHub and **does not need to change**. Providers are not
mutually exclusive — GitHub and Google can both be enabled on the same Supabase
project at once, and each app renders whichever buttons it wants.

If you ever do want both buttons on one site:

1. Enable both providers in the Supabase dashboard (project-wide, already done
   for GitHub).
2. Add a `signInWithGoogle` action next to `signInWithGitHub` in
   `src/lib/supabase/actions.ts` — identical except `provider: 'google'`. The
   `apikey` workaround applies to both.
3. Render both buttons on the login page.

**Identity linking:** Supabase merges providers into one user only when the
emails match _and_ are verified. Kyle's GitHub and Google accounts use different
emails, so in practice this produces **two users with two UUIDs** — which is
expected, not a problem. Add both to `BLOG_OWNER_USER_IDS` (it's comma-separated)
and both identities are owners. See §10 for the one case where two identities
actually matters: per-user RLS.
