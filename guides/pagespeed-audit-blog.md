# PageSpeed Audit — Blog Index (`/blog`)

**Run:** Aug 31, 2026, 4:12 PM EDT · Lighthouse 13.4.1 · Emulated Moto G Power · Slow 4G · HeadlessChromium 151

| Metric | Value | Points | Verdict |
| --- | --- | --- | --- |
| **Performance** | **86** | | close |
| First Contentful Paint | 0.9 s | 10 / 10 | good |
| Largest Contentful Paint | **3.8 s** | **14 / 25** | the whole problem |
| Total Blocking Time | 110 ms | 29 / 30 | good |
| Cumulative Layout Shift | 0 | 25 / 25 | perfect |
| Speed Index | 3.8 s | 8 / 10 | fine |
| Accessibility / Best Practices / SEO | 92 / 100 / 100 | | fine |

Companion to [`pagespeed-audit.md`](./pagespeed-audit.md), which covers `/`. Two of the
findings below are **site-wide**, not blog-specific — see
[This isn't only a blog problem](#this-isnt-only-a-blog-problem).

---

## Read the numbers first

**The gap to 90 is 4 points and there are only 11 available.** Three of the five metrics
are at or near ceiling — CLS is a perfect 25/25, TBT gives up 1 point, FCP gives up
nothing. Every point worth chasing is in LCP (11 available) and Speed Index (2).

So this is not a "tune everything a bit" job. It is one metric.

**LCP and Speed Index are the same number: 3.8 s.**

That coincidence is the diagnosis. Speed Index measures how fast the viewport reaches its
final visual state; LCP measures when the largest element paints. When they land on the
same value, the page is not painting progressively — it does essentially nothing, and then
everything appears at once. Compare the home page, where SI (15.4 s) and LCP (4.3 s) were
four seconds apart because a canvas kept repainting long after the text landed.

**And the LCP breakdown says the network is blameless:**

```
Time to first byte          0 ms
Element render delay    1,960 ms
"Went to a hackathon that I didn't even participate in. Had the best time and re…"  <span>
```

TTFB zero, 100% render delay. Same shape as the home page's finding — but this time the
cause is not an opacity animation. That element is not late to *become visible*.

**It is not in the HTML at all.**

> The 3.8 s headline and the 1,960 ms breakdown differ because one is Lighthouse's
> simulated Slow-4G value and the other is the observed trace value. Same cause. This is
> the same caveat as the home-page audit.

---

## Root causes, ranked

### 1. The post list is not server-rendered — Next bails the whole thing to the client · `src/app/blog/page.tsx` + `BlogIndexClient.tsx`

**Owns:** LCP 3.8 s · Speed Index 3.8 s · both long tasks · ~11 of the 14 missing points

The prerendered document for `/blog` contains the heading, the RSS icon, the navbar and
the footer — and then this, exactly where the post list should be:

```html
<a href="/blog/feed.xml" … aria-label="RSS feed">…</a></div>
<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->
</div></main>
```

`BAILOUT_TO_CLIENT_SIDE_RENDERING` is Next's own digest string. Not one `<li>` of post
markup ships in the HTML. The post data is present, but only as escaped JSON inside the
RSC flight payload (`self.__next_f.push([…"Went to a hackathon that I didn't even
participate in"…])`) — data for the client to render, not markup the browser can paint.

**Why.** `BlogIndexClient` reads the URL during render (`BlogIndexClient.tsx:120,125-127`):

```tsx
const searchParams = useSearchParams();
const [selectedTag, setSelectedTag] = useState<string | null>(() =>
  searchParams.get('tag'),
);
```

In the App Router, calling `useSearchParams()` in a client component on a **statically
rendered** route forces the tree up to the nearest `Suspense` boundary to be
client-rendered. `page.tsx:38-42` supplies that boundary:

```tsx
// useSearchParams() inside BlogIndexClient needs a Suspense
// boundary when this page is prerendered.
<Suspense>
  <BlogIndexClient posts={posts} />
</Suspense>
```

The comment is right about the requirement and silent about the consequence: the boundary
is not a formality that keeps the build happy, it is **the line where server rendering
stops**. It has no `fallback`, so the static HTML gets a hole. Everything inside it —
every post title, description, date and tag chip, i.e. the entire page — waits for:

1. the document to arrive (1,223 ms simulated),
2. both stylesheets to arrive (1,577 ms — see #3),
3. **every** entry chunk to download, including 220 KiB of Three.js that exists only for
   the 404 page (see #2),
4. React to hydrate — the 138 ms long task at 1,815 ms, in `4334-…js`, which is the
   react-dom chunk,
5. `useSearchParams()` to resolve and `BlogIndexClient` to render.

Only then does the largest text on the page exist. That is the 1,960 ms of render delay,
and it is why SI and LCP are the same number.

**The one-line proof, if you want to re-run it after a fix.** From a production build:

```bash
grep -c 'BAILOUT_TO_CLIENT_SIDE_RENDERING' .next/server/app/blog.html      # currently 2
grep -c '>Intro to Bash Aliases<'          .next/server/app/blog.html      # currently 0
grep -c 'BAILOUT_TO_CLIENT_SIDE_RENDERING' .next/server/app/projects.html  # 0 — for contrast
```

`/projects` prerenders completely. `/blog` does not, and the second command is the honest
test: zero rendered post titles in the shipped HTML.

---

### 2. `not-found.tsx` puts Three.js and Motion in every route's entry bundle · `src/app/not-found.tsx`

**Owns:** "Reduce unused JavaScript — 203 KiB" (all of it) · feeds LCP and TBT

Lighthouse names four chunks. All four are dependencies of the 404 page, on a page that
is a list of text links:

| Report chunk | Transfer | Unused | What's actually in it | Evidence |
| --- | ---: | ---: | --- | --- |
| `e8867c6f-…js` | 100.1 KiB | 90.7 (91%) | three.js core | `BufferGeometry` ×20 |
| `7566a6ad-…js` | 85.2 KiB | 45.4 (53%) | three.js WebGL renderer | `WebGLRenderer` ×35 |
| `3166-…js` | 41.5 KiB | 35.2 (85%) | `motion` | 121 KB raw, `motion` ×76 |
| `91c6c604-…js` | 34.3 KiB | 31.3 (91%) | `react-reconciler` (R3F) | `reconciler` |
| **Total** | **261.0 KiB** | **202.6 KiB** | | |

Which is the report's "kylehagerman.dev 1st party — 261.0 KiB, 202.6 KiB savings", line
for line.

**How they get here.** `not-found.tsx` imports the heavy stuff statically:

```tsx
import { SparkleField } from '@/components/backgrounds/SparkleField';     // :3
import { NotFoundContent } from '@/components/not-found/NotFoundContent'; // :4
```

- `SparkleField` → `@react-three/fiber` + `@react-three/drei` + `three`
- `NotFoundContent` → `motion/react` (`:6`), `WaveSpray` (`:8` — three again),
  `LiquidGlassCard` (`:9`)

Next includes the root `not-found` boundary in the client entry for **every** route, so
client-side navigation to a 404 works without a round trip. Verified across the whole
site — every prerendered page's script list carries `app/not-found-*.js` and its
dependencies:

```
/blog       → layout · not-found · blog/page
/about-me   → layout · not-found · about-me/page
/projects   → layout · not-found · projects/page
/experience → layout · not-found · experience/page
/contact    → layout · not-found · contact/page
```

Nothing else in `/blog`'s graph imports `motion` — checked every component the route
touches (`Navbar`, `Footer`, `HamburgerMenu`, `ThemeMenu`, `GradientTextHover`,
`HaloRingHover`, `Chip`, `Collapsible`, `Separator`, `JsonLd`, `BlogIndexClient`): zero
hits. That 41.5 KiB of Motion is on the page purely because a 404 might happen.

This is the cost of the "styled not found page" commit (`4dd623a`), and it landed after
the home-page audit was written — so it is not in that document, and the Tier 2
code-splitting work done there is partly undone by it on every route.

> **Caveat on the chunk identification.** Hash-prefixed chunk ids (`e8867c6f`,
> `7566a6ad`, `91c6c604`) are stable module-group ids and match the local build byte for
> byte. Numeric ids are per-build, so the report's `3166` is a different number locally
> (`8080`); mapping it to `motion` is inference — but it is the only remaining library in
> the entry anywhere near 41.5 KiB transfer / 121 KB raw, and its 85% unused rate is what
> a loaded-but-never-rendered animation library looks like.

---

### 3. Render-blocking CSS — 590 ms in front of everything · `src/app/globals.css`

**Owns:** "Render-blocking requests — 590 ms" · the middle of the critical path

```
kylehagerman.dev/blog          13.72 KiB   1,223 ms
  └ css/b496025c9cd768cc.css    1.4 KiB   → 1,384 ms   (next/font: Geist + Geist Mono)
  └ css/1777b40ce2dc5a9b.css   17.9 KiB   → 1,577 ms   (globals.css)
Maximum critical path latency: 1,577 ms
```

Same finding as the home page's #6, where it was correctly deprioritised — FCP was
already 0.9 s and there were 22 seconds of TBT to deal with first. On `/blog` there is
nothing else, so 590 ms of a 3.8 s LCP is now worth having.

Two contributing details:

- The stylesheets are **discovered** by parsing the document, so they cannot start before
  it finishes. That is an extra serial round trip no `preload` can remove, because the
  hint would live in the same document.
- `globals.css` is 765 lines / 24 KB of source shared by every route, and ~160 of those
  lines (`:606-765`) are `.blog-prose` — article typography used only on `/blog/[slug]`,
  never on the index. Roughly a fifth of the blocking stylesheet is dead weight on this
  page, and on every other page too.

---

### 4. The `browserslist` fix from the last audit cannot remove these polyfills

**Owns:** "Legacy JavaScript — 12 KiB" (unscored)

The previous audit added `browserslist` to `package.json` to drop 11.6 KiB of polyfills.
It is committed and deployed — and Lighthouse still reports the identical 11.6 KiB in the
identical chunk. Worth writing down so it doesn't get re-attempted.

The flagged list is:

```
Array.prototype.at · Array.prototype.flat · Array.prototype.flatMap
Object.fromEntries · Object.hasOwn · String.prototype.trimStart · String.prototype.trimEnd
```

That is not a transpiler's output. It is, verbatim and in that order, the contents of
`next/dist/build/polyfills/polyfill-module.js`:

```js
"trimStart"in String.prototype||(String.prototype.trimStart=String.prototype.trimLeft),
"trimEnd"in String.prototype||…,"description"in Symbol.prototype||…,
Array.prototype.flat||(…),Promise.prototype.finally||(…),Object.fromEntries||(…),
Array.prototype.at||(…),Object.hasOwn||(…)
```

Next bundles that file into the main client chunk group unconditionally — it is not
derived from `browserslist` and there is no config flag to opt out. `4334-…js` is the
react-dom chunk (`hydrateRoot`, `createRoot`) and the polyfills ride along inside it,
which is also why that chunk shows up in both long tasks: those tasks are React work, not
polyfill work.

**Nothing to do here.** It is 12 KiB, it is unscored, and it is Next's call, not yours.
Leave it. (The `browserslist` entry still earns its keep for the app's own transpilation —
it just was never going to move this line.)

---

### 5. TBT and CLS: leave them alone

- **CLS is 0.** Perfect score. This is what the home page's `LiquidGlassCard` width
  animation costs you by comparison, and it is worth protecting: any fix in Tier 1 that
  makes content appear *after* first paint risks trading 11 LCP points for 25 CLS points.
  Prerendering the list (1.1) moves in the safe direction — it puts content into the first
  paint rather than after it.
- **TBT is 110 ms, worth 1 point.** Two long tasks, both in the react-dom chunk: 138 ms at
  1,815 ms (hydration) and 86 ms at 3,901 ms (consistent with the client-side render of
  the bailed-out subtree). Fixing #1 and #2 shrinks both as a side effect. There is
  nothing to target directly.

---

## This isn't only a blog problem

| Finding | Scope |
| --- | --- |
| #1 CSR bailout | `/blog` only — it is the only route reading `useSearchParams()` during render |
| #2 404 ships three.js + motion | **Every route on the site**, `/` included |
| #3 Render-blocking CSS | **Every route** |
| #4 Next polyfills | Every route, and not fixable |

Fixing #2 helps `/`, `/about-me`, `/projects`, `/experience`, `/contact` and `/resume` at
the same time, and partially restores the code-splitting win from the previous audit's
Tier 2 — which was measured before the 404 page existed.

---

## Fix plan

### Tier 1 — this is where 90 lives

**1.1 Get the post list into the HTML.** Everything else in this document is a rounding
error next to it. Three ways, in order of preference:

**Option A — read the tag after mount (keeps the route static).** Recommended.

```tsx
// BlogIndexClient.tsx — no useSearchParams(), no render-time URL read
const [selectedTag, setSelectedTag] = useState<string | null>(null);

useEffect(() => {
  setSelectedTag(new URLSearchParams(window.location.search).get('tag'));
}, []);
```

Then delete the `<Suspense>` wrapper in `page.tsx:40-42`. The list prerenders in full,
LCP collapses to roughly FCP, and the route stays a static CDN hit.

It must be an effect, not a lazy `useState` initialiser — reading `window` during render
is a hydration mismatch. The cost: a `?tag=` deep link paints the unfiltered list for one
frame before the filter applies. That is a secondary entry path (tag links inside article
headers), and one frame of "more posts than asked for" is a far smaller sin than two
seconds of empty page for everyone else.

**Option B — read `searchParams` on the server.** `page.tsx` is already an async server
component, so it can take `searchParams` and pass `initialTag` down. Deep links are then
correct on the first paint with no flash. Cost: reading `searchParams` opts the route out
of static rendering, so every visit is an SSR render instead of a CDN file. `listPosts()`
is `revalidate: 300`-cached so it would not hit GitHub per request, but TTFB stops being
free — and TTFB is currently 0.

**Option C — narrow the boundary.** Keep `useSearchParams()` but confine it to a small
client component that renders only the tag chips, leaving the list server-rendered.
Awkward here, because `selectedTag` is the shared state driving both. Mentioned for
completeness; A is cleaner.

**Verify with the greps in #1** — `>Intro to Bash Aliases<` should be non-zero and
`BAILOUT_TO_CLIENT_SIDE_RENDERING` should be gone from `blog.html`.

**1.2 Keep Three.js and Motion out of every route's entry.** ~200 KiB of unused JavaScript
off the critical path, site-wide.

`not-found.tsx` is a server component, so `next/dynamic(..., { ssr: false })` cannot be
called from it directly — Next rejects that combination in Server Components. Push the
lazy boundary into the client component that already exists:

```tsx
// NotFoundContent.tsx (already 'use client')
const SparkleField = dynamic(
  () => import('@/components/backgrounds/SparkleField').then((m) => m.SparkleField),
  { ssr: false },
);
const WaveSpray = dynamic(
  () => import('@/components/animated-fun/Wavespray').then((m) => m.WaveSpray),
  { ssr: false },
);
```

…and move the `<SparkleField />` mount from `not-found.tsx:32` into `NotFoundContent` so
the route file imports nothing heavy. Both canvases are decorative and already fade in, so
a late mount is invisible on the page that actually needs them.

`motion` is the remaining 41.5 KiB. It comes in through `NotFoundContent`'s own staggered
entry animation and through `LiquidGlassCard`. If you want it gone from other routes too,
the whole of `NotFoundContent` has to be behind the dynamic boundary — a thin
`not-found.tsx` that `dynamic()`s one client component containing everything. Worth doing;
it is the same 41.5 KiB on six routes.

### Tier 2 — the last few points

**2.1 Inline the CSS.** Next 15 can fold stylesheets into the document and remove that
round trip entirely:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: { inlineCss: true },
};
```

Takes both `<link rel="stylesheet">` hops out of the critical path (~590 ms). It is
flagged experimental, and the trade is real: the document grows from ~14 KiB to ~32 KiB
and the CSS is no longer separately cached across navigations. For a site where most
visits are single-page arrivals from a link, that trade is usually worth it — but measure
it rather than assume, and it is a `next.config.ts` change that affects every route.

**2.2 Split `blog-prose` out of `globals.css`.** `globals.css:606-765` is ~160 lines of
article typography loaded by every route and used by exactly one (`/blog/[slug]`). Moving
it to a CSS module or a stylesheet imported from that route's layout takes roughly a fifth
off the render-blocking stylesheet site-wide.

### Tier 3 — noted, not recommended

- **Legacy JS polyfills (12 KiB).** See #4 — Next injects these unconditionally. Nothing
  to do.
- **Accessibility 92.** Not a performance item and not diagnosed here, but it is the only
  other sub-100 score on the page and worth its own pass.

### Expected outcome

| Change | LCP | Score effect |
| --- | --- | --- |
| Today | 3.8 s | 86 |
| 1.1 alone (list in the HTML) | ~1.5 s | LCP ≈ 24/25, SI ≈ 10/10 → **high 90s** |
| …even if LCP only reaches 2.5 s | 2.5 s | LCP 22/25 → **~94** |
| 1.2 + 2.1 on top | — | trims TBT's last point and hardens the margin |

**1.1 is sufficient on its own.** LCP is worth 25 points and currently earns 14; putting
the content in the first paint is the difference between "renders after hydration" and
"renders". 1.2 and 2.1 are worth doing because they help every other route — but if the
only goal is a 90 on `/blog`, 1.1 is the entire job.

---

## How the evidence in this document was gathered

No builds were run; everything came from the existing `.next` output and the source tree.
Recorded so it can be repeated after the fixes.

```bash
# The shipped document for a route (production build output)
.next/server/app/blog.html

# Is the content actually server-rendered?
grep -c 'BAILOUT_TO_CLIENT_SIDE_RENDERING' .next/server/app/blog.html
grep -c '>Intro to Bash Aliases<'          .next/server/app/blog.html
grep -o '<!--\$[?!]\?-->' .next/server/app/blog.html | sort | uniq -c

# Which chunks does a route's entry actually load?
grep -o 'src="/_next/static/chunks/[^"]*"' .next/server/app/blog.html

# What is in a chunk? (fingerprint by distinctive identifiers)
grep -o 'WebGLRenderer'  .next/static/chunks/7566a6ad-*.js | wc -l
grep -o 'BufferGeometry' .next/static/chunks/e8867c6f-*.js | wc -l

# Which components pull a heavy dependency into a route's graph?
grep -rln "from 'motion/react'" src
grep -rn "from 'three'\|@react-three" src --include=*.tsx --include=*.ts
```

One caveat on the local `.next`: the manifests in it are from a `next dev` run, but the
`server/app/*.html` files and the hash-named `static/chunks/*` are production artifacts,
and the chunk filenames match the Lighthouse report exactly (`4334-2181f091c01875f3.js`,
`7566a6ad-78372da0f26e83d0.js`, `91c6c604-21f6fccfabb880f4.js`). Numeric chunk ids and
content hashes shift between builds; the hash-prefixed module-group ids do not.
