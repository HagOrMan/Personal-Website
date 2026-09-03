# PageSpeed Audit — About Me (`/about-me`)

**Run:** Aug 31, 2026, 10:28 PM EDT · Lighthouse 13.4.1 · Emulated Moto G Power · Slow 4G · HeadlessChromium 151
**Commit under test:** `6bdfb8b` (Aug 31, 2026, 5:44 PM EDT) — the run is ~4.5 h later, so this is the deployed build.

| Metric | Value | Verdict |
| --- | --- | --- |
| Performance | **75** | mid |
| First Contentful Paint | 1.5 s | mid |
| Largest Contentful Paint | **4.1 s** | bad |
| Total Blocking Time | 340 ms | mid |
| Cumulative Layout Shift | 0 | perfect |
| Speed Index | **5.1 s** | bad |
| Accessibility / Best Practices / SEO | 96 / 100 / 100 | fine |

This is a milder version of the same disease as `/` — a Three.js canvas that never stops
rendering — plus three problems the home page doesn't have. See
[`pagespeed-audit.md`](./pagespeed-audit.md) for the home-page write-up.

---

## Read the numbers first

### 1. None of the home-page audit's fixes are in the tree

Before anything else, because it changes how you read the rest of this document. I checked
`HEAD` (`6bdfb8b`) directly:

| Fix from `pagespeed-audit.md` | In tree? |
| --- | --- |
| `browserslist` in `package.json` | no |
| `next/dynamic` anywhere in `src/` | no |
| `useIsOnScreen` in `screenUtils.ts` | no |
| `frameloop` gating in `OceanParticles.tsx` | no |
| `primeVideo` / intent-driven preconnect in `page.tsx` | no |

The "Changes applied" section of `pagespeed-audit.md` describes work that is not currently
checked in. Everything below is measured against that baseline. Three of this page's
findings (#6, #7, #8) are the *same* findings as the home page's, re-flagged for the same
reason.

### 2. The main-thread problem is real, but 14× smaller than the home page's

| Category | `/about-me` | `/` (for contrast) |
| --- | --- | --- |
| **Other** | **2,928 ms** | 40,079 ms |
| Script Evaluation | 731 ms | 707 ms |
| Script Parsing & Compilation | 177 ms | 88 ms |
| Style & Layout | 90 ms | 104 ms |
| Rendering | 30 ms | 70 ms |
| Parse HTML & CSS | 13 ms | 8 ms |
| **Total** | **4.0 s** | 41.1 s |

Same shape: "Other" — per-frame render/raster work the JS *commands* rather than work the
JS *is* — is 73% of the main thread. It's smaller here only because the canvas is 96 px
instead of full-screen. It is still the single biggest line item, and it is still infinite.

### 3. LCP is not a network problem

| Subpart | Duration |
| --- | --- |
| Time to first byte | 0 ms |
| Resource load delay | 270 ms |
| Resource load duration | 350 ms |
| **Element render delay** | **1,800 ms** |

The image's bytes are on the device at roughly 620 ms. LCP fires at 4.1 s. Everything
between those two numbers is the browser failing to produce a frame, not the network.

> **Caveat, stated plainly:** those subparts sum to 2,420 ms, not the reported 4,100 ms,
> and a 0 ms TTFB is not a real measurement. Don't trust the absolute values here; the
> *shape* — network done early, paint late — is what the rest of the report corroborates,
> and it's what the fixes target.

---

## Root causes, ranked

### 1. The WaveSpray canvas renders 1,550 particles forever, ungated · `src/components/animated-fun/Wavespray.tsx`

**Owns:** the "Other: 2,928 ms", and most of what's blocking the LCP frame.

**The geometry.** `CORE_COUNT = 800` + `SPRAY_COUNT = 750` (lines 56–57) = 1,550 point
sprites. Point size is `17.0 * uPixelRatio` before falloff and jitter (line 147), and
`uPixelRatio` reads raw `window.devicePixelRatio` with no cap (lines 372–373).

**On the audited device.** Lighthouse's own DOM-size audit hands you the measurement:

```
<canvas style="display: block; width: 96px; height: 96px;"
        data-engine="three.js r182" width="168" height="168">
```

168 / 96 = **DPR 1.75, uncapped**. So the backing store is 28,224 pixels and each particle
is ~22–37 device px across — call it ~700 px² of sprite. 1,550 × 700 ≈ **1.1 M shaded
fragments per frame over a 28 K-pixel canvas: roughly 38× overdraw**, additively blended
with `depthWrite: false`, so there is no early-Z rejection to save any of it. Every
fragment runs a `distance()`, a `discard`, two `mix()`es and a `pow()`.

**The loop has no exit.** `useFrame` (line 324) runs eight `MathUtils.lerp` calls, two
`Color.lerp` calls and a time accumulation every tick, unconditionally. It keeps running:

- when the header has scrolled off the top of the page,
- when the tab is backgrounded,
- when the visitor has asked for reduced motion.

`usePrefersReducedMotion()` already exists in `src/lib/screenUtils.ts:21` and is never
called here. `<Canvas>` (line 435) takes no `frameloop` and no `dpr` — note that
`SparkleField.tsx:56` and `Sunrise.tsx:579` both cap at `dpr={[1, 2]}`; this one doesn't.

**What it buys.** A 96 px decorative squiggle beside the page title
(`src/app/about-me/page.tsx:16-17`). That is the whole return on 2.9 s of main thread.

---

### 2. The LCP element's bytes arrive at 0.6 s and its pixels at 4.1 s · `src/components/about-me/AboutMeClient.tsx:105-116`

The LCP element is the mobile "Hear it from me" poster button.

**Discovery is not the problem — I traced the chain.** `useMediaQuery` seeds `false` on the
server *and* on the first client render (`screenUtils.ts:5`), so `!isDesktop` is `true` and
the button server-renders. `priority` (line 115) emits the `fetchpriority="high"` preload.
Lighthouse agrees: *"Request is discoverable in initial document."* Nothing to fix there.

**So what's left is paint scheduling.** The long-task list brackets the LCP timestamp
almost exactly:

```
2,283 ms → 98 ms   (chunk 4334)
3,001 ms → 176 ms  (chunk e8867c6f — three.js)
4,066 ms → 57 ms   (chunk 4334)
4,136 ms → 144 ms  (chunk 4334)   ← LCP lands at 4.1 s, inside this cluster
4,299 ms → 72 ms   (chunk 3166)
5,128 / 5,181 / 7,063 ms (chunk 7460)
```

Between FCP (1.5 s) and LCP (4.1 s) the main thread is hydrating a fully client-side page
tree, compiling Three.js, and booting a WebGL context. The frame containing the decoded
poster can't be committed until that clears. Two things make it worse, and both are fixable:
the 640 px-wide image is 2.75× more decode work than the slot needs (#5), and the text above
it is still animating in (#3).

**To confirm before spending effort:** record a DevTools performance trace of `/about-me` at
4× CPU throttle and check whether the poster's `Paint` lands in the gap between the 2,283 ms
and 4,136 ms tasks. Every Tier 1 fix targets that gap regardless, so this is worth
confirming but not worth blocking on.

---

### 3. The page's headline ships invisible · `src/components/layout/PageHeader.tsx`

**Owns:** most of Speed Index 5.1 s. Also drags FCP.

Motion renders a component's `initial` state during SSR. `PageHeader` sets
`initial='hidden'` (line 80) against `hidden: { opacity: 0, y: 12 }` (line 63), so the
`<h1>` and the description arrive in the HTML as:

```html
<h1 style="opacity: 0; transform: translateY(12px)">About Me</h1>
```

They become visible only after Motion hydrates and works through `delayChildren: 0.05` +
`staggerChildren: 0.12` + `duration: 0.5` (lines 56, 67). On a throttled Moto G Power
that's the top of the page still resolving well past 2 s.

Stack the `WaveSpray` wrapper on top of it — a `transition-opacity duration-1000` that only
starts once the canvas reports `onCreated` (lines 430, 440), i.e. after Three.js has
compiled at ~3 s — and the last visual change on the page is somewhere around 4–5 s.

**That is your Speed Index.** SI 5.1 s is not measuring slow bytes; it is measuring a page
whose top third is deliberately withheld and then faded in on a chain of client-side timers.
FCP pays for it too: at first paint, the largest text on the page is transparent.

This one is site-wide — `PageHeader` is on every sub-page.

---

### 4. Everything a mobile visitor can't reach still ships and mounts · `AboutMeClient.tsx`

`next/dynamic` appears nowhere in `src/`. So on a 412 px phone, the initial bundle includes:

| Statically imported | Rendered on mobile? | What it drags in |
| --- | --- | --- |
| `WaveSpray` (`about-me/page.tsx:2`) | yes, 96 px of it | `three` + `@react-three/fiber` + `@react-three/drei` |
| `VideoStickyShell` (line 227) | **no** — behind `isDesktop &&` | `VideoExperience` (534 lines) → Radix Dialog, `VideoControlBar`, `VideoEndCard`, `VideoTableOfContents`, `VideoTranscriptPanel`, `useVideoExperience` — ~1,200 lines total |
| `VideoModalShell` (line 236) | mounts with `open={false}` | Radix Dialog Root + `AnimatePresence` + the same `VideoExperience` tree, plus a preconnect (#6) |

`VideoStickyShell` is never rendered on this device at all, and its cost is paid in full.

Mapping to the report's "Reduce unused JavaScript — 131 KiB of 226.7 KiB":

| Chunk | Transfer | Unused | Long tasks | Almost certainly |
| --- | --- | --- | --- | --- |
| `e8867c6f` | 100.1 KiB | **84.3 KiB** | 176 ms @ 3,001 ms | three.js |
| `7566a6ad` | 85.2 KiB | 24.1 KiB | — | react-dom |
| `3166` | 41.5 KiB | 22.7 KiB | 72 ms @ 4,299 ms | motion |
| `7460` | — | — | 86 / 57 / 53 ms @ 5.1–7.1 s | the page + video tree |

84 KiB unused out of a 100 KiB chunk is the signature of a library imported for one small
thing. `pagespeed-audit.md` already prescribed `dynamic()` for exactly `OceanScene` and
`VideoModalShell`; the prescription was never filled, and this page needs the same treatment
for `WaveSpray` and the whole video tree.

---

### 5. The poster misses its srcset bucket by 8 pixels · `AboutMeClient.tsx:111-116`

Lighthouse: *"This image file is larger than it needs to be (640x1135) for its displayed
dimensions (385x685)."* Here is the exact arithmetic, because the fix depends on it.

```
sizes='224px'  ×  DPR 1.75  =  392 device px needed
```

Next's default candidate widths, in order:

```
imageSizes  [16, 32, 48, 64, 96, 128, 256, 384]
deviceSizes [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
                    ^
                    nothing exists between 384 and 640
```

392 > 384, so the browser takes **640**. You miss the correct bucket by 8 device pixels and
pay 1.66× the width — 2.7× the pixels — for it. 76.4 KiB where ~28 KiB would do; Lighthouse's
48.7 KiB estimate is the delta down to 384w.

The download is the smaller half of the cost. **640 × 1135 = 726 K pixels to decode versus
385 × 685 = 264 K.** That decode happens on the main thread, in the same congested window
where LCP is waiting (#2).

Source file is `public/posters/about-me.jpg`, 177 KB — the largest of the six posters.

---

### 6. Unused preconnect · `src/components/video/VideoModalShell.tsx:45`

```tsx
preconnect(new URL(videos[0].src).origin);
```

Called during render, unconditionally on mount, regardless of `open`. On mobile the modal
only opens on a deliberate tap, so for every visitor who doesn't tap, the browser opens a
DNS + TLS connection to `media.kylehagerman.dev` and never sends a byte over it.

Worth noting: the comment directly above it (line 42) says *"see primeVideoPlayback calls at
each trigger button"* — there is no such call site anywhere in the tree. The comment
describes the intended design; the wiring isn't there.

Same finding as home-page #8, same root cause.

---

### 7. Render-blocking CSS · est. 180 ms

```
css/b496025c9cd768cc.css     1.4 KiB   150 ms
css/1777b40ce2dc5a9b.css    17.9 KiB   600 ms
```

Maximum critical path latency 462 ms, and the entire chain is document → CSS → done. Same
as home-page #6: Tailwind v4 emits one sheet for everything the route touches, and
`globals.css` is 24.4 KB of source declaring three full palettes (`lush`, `breeze`,
`nebula`) in both light and dark.

---

### 8. Legacy JavaScript — 12 KiB, and `browserslist` will not fix it

I traced this one specifically, because the home-page audit's Tier 3 prescribed a fix that
wouldn't have worked. The flagged polyfills are:

```
String.prototype.trimStart / trimEnd, Array.prototype.flat / flatMap / at,
Object.fromEntries, Object.hasOwn
```

That exact list is `node_modules/next/dist/build/polyfills/polyfill-module.js`, which is
`require`d unconditionally at the top of `node_modules/next/dist/client/app-globals.js` —
part of the App Router client runtime:

```js
// node_modules/next/dist/client/app-globals.js
require("../build/polyfills/polyfill-module");
```

**A `browserslist` key in `package.json` governs SWC's output for your code and your
dependencies. It does not remove a module Next hard-`require`s into its own client entry.**
Adding it, as home-page Tier 3 suggested, would not have moved this number.

11.6 KiB. The only lever is aliasing the module to a no-op in a webpack config — unsupported,
and it breaks silently on the next Next.js upgrade. **Skip this one.** It's the smallest item
in the report and the only one with no safe fix.

---

### 9. `useMediaQuery` re-subscribes on every change · `src/lib/screenUtils.ts:15`

```tsx
useEffect(() => {
  const media = window.matchMedia(query);
  if (media.matches !== matches) setMatches(media.matches);
  const listener = () => setMatches(media.matches);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}, [matches, query]);   // ← `matches`
```

`matches` in the dependency array means every match change tears the listener down and
re-subscribes. The seed-by-comparison also costs an extra render on mount for every
consumer — three of them on this page (`AboutMeClient`, `VideoModalShell` via
`usePrefersReducedMotion`, `VideoExperience`).

Small. Free to fix. Same as home-page Tier 3.

---

## Fix plan

### Tier 1 — LCP and TBT live here

**1.1 Gate the WaveSpray render loop.** The single biggest item. `frameloop` on the
`<Canvas>` is the lever that actually works — returning early from `useFrame` doesn't help,
because R3F still calls `gl.render()` every tick, and drawing 1,550 additively blended points
*is* the cost.

```tsx
// Wavespray.tsx — needs an IntersectionObserver + visibilitychange hook.
// `useIsOnScreen` was written for exactly this in the home-page work but is
// not in the tree; it needs to be (re)added to screenUtils.ts.
const containerRef = useRef<HTMLDivElement>(null);
const onScreen = useIsOnScreen(containerRef);
const prefersReducedMotion = usePrefersReducedMotion();

const frameloop = !onScreen ? 'never' : prefersReducedMotion ? 'demand' : 'always';

<Canvas frameloop={frameloop} dpr={[1, 1.5]} /* … */ >
```

The decoration sits beside the `<h1>`, so it scrolls out of view within one screen of
scrolling — `'never'` will be doing real work for most of a real visit, and all of it in a
background tab.

**1.2 Cap DPR and cut the particle count.** `dpr={[1, 1.5]}` alone takes the backing store
from 168² to 144² (−27% fragments). Then halve the counts: `CORE_COUNT` 800 → 400,
`SPRAY_COUNT` 750 → 375. At 96 CSS px with ~30 px sprites at 38× overdraw, half the particles
is not a visible difference — you are well past the point where more points add information.
Together: roughly a 3× cut in per-frame GPU work.

**1.3 Split Three.js and the video tree out of the initial bundle.** `about-me/page.tsx` is a
server component, so the `dynamic(..., { ssr: false })` call has to live in a client module —
put it in `AboutMeClient` (or a one-line `WaveSprayLazy.tsx`):

```tsx
const WaveSpray = dynamic(
  () => import('@/components/animated-fun/Wavespray').then((m) => m.WaveSpray),
  { ssr: false, loading: () => <div className='h-full w-full' /> },
);

const VideoModalShell = dynamic(
  () => import('@/components/video/VideoModalShell').then((m) => m.VideoModalShell),
  { ssr: false },
);

const VideoStickyShell = dynamic(
  () => import('@/components/video/VideoStickyShell').then((m) => m.VideoStickyShell),
  { ssr: false },
);
```

`WaveSpray` already fades itself in on `onCreated`, so arriving a beat later is invisible.
Warm the modal's chunk on hover/focus/touch of the poster button so the tap isn't waiting on
a download — that's the `primeVideo` pattern the stale comment at `VideoModalShell.tsx:42`
refers to but which doesn't exist yet.

Expected: ~100 KiB of three/R3F/drei plus the Radix Dialog tree off the critical path, which
is where the 176 ms task at 3,001 ms and most of the 84.3 KiB of unused JS live.

### Tier 2 — real wins, more work

**2.1 Stop shipping the headline invisible.** Either render `PageHeader` at rest and animate
something that doesn't gate visibility, or — cheaper — keep the entrance but drop the opacity
leg of it, so the SSR HTML has readable text:

```tsx
const itemVariants: Variants = {
  hidden: { y: 12 },              // was { opacity: 0, y: 12 }
  visible: { y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
```

Also short-circuit the whole thing under `prefers-reduced-motion`. This is a site-wide Speed
Index fix, not just an about-me one.

**2.2 Give the poster a bucket it can hit.** Three options, in order of how much I'd trust
them:

- **Add a candidate width** so 392 has somewhere to land. One line, precise, and it fixes the
  class of problem rather than this instance:
  ```ts
  // next.config.ts
  images: { imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 448] },
  ```
  392 → picks 448. ~40 KiB saved, ~45% less decode, no visible quality change. Costs one
  extra entry in every `srcset` on the site.
- **Lower `quality`** to 65 on this image. Keeps 640w crispness, cuts bytes, does nothing for
  the decode cost.
- **Shrink `sizes` to `'216px'`** so 216 × 1.75 = 378 → picks 384. Works, but it is tuned to
  one device's DPR; a DPR-2 phone lands on 432 and jumps back to 640. Don't.

**2.3 Move the preconnect onto intent.** Take it out of `VideoModalShell`'s render body and
fire it from the poster button's `onPointerEnter` / `onFocus`, alongside the chunk warm from
1.3. Falls out of Tier 1.3 for free.

### Tier 3 — quick, cheap, do them while you're in there

- **`useMediaQuery`** (`screenUtils.ts:15`) — drop `matches` from the deps; seed from
  `media.matches` in the effect body without the comparison.
- **Confirm `VideoStickyShell` never loads on mobile** — it's already behind `isDesktop &&`,
  so 1.3's `dynamic()` finishes the job; just verify the chunk isn't requested at 412 px.
- **Recompress `public/posters/about-me.jpg`** — 177 KB, the largest of the six posters, and
  the only one on the critical path.
- **Skip the polyfills** (#8), and **skip CLS** (it's 0).

### Expected outcome

Tier 1 is most of the score. 1.1 and 1.2 take "Other" from 2,928 ms toward a few hundred,
which drops TBT from 340 ms and — more importantly — unclogs the window where LCP is waiting
for a frame. 1.3 removes the 176 ms Three.js compile task from that same window. Together
those should pull LCP from 4.1 s toward FCP.

Tier 2.1 is the Speed Index fix; SI 5.1 s is almost entirely "the visible page is still
resolving at 4–5 s", and it is worth 6 points on its own.

**75 → high 80s from Tier 1, low-to-mid 90s with Tier 2.** LCP (+12), TBT (+22) and SI (+6)
are 40 of the 100 points, and all three respond to the same handful of changes.

---

## Appendix: what is *not* wrong

Worth stating plainly, because these are the things people reach for first:

- **CLS is 0.** Perfect. The `aspect-[9/16]` on the poster button and the fixed `size-24` on
  the decoration are doing their job. Don't touch either.
- **TTFB and hosting are fine.** The document is 12.97 KiB and lands in 276 ms.
- **Total transfer is small.** 226.7 KiB of JS across the flagged chunks is unremarkable. The
  problem is that 131 KiB of it is never executed and one 100 KiB chunk blocks the main thread
  for 176 ms — not the size itself.
- **The transcripts are fine.** All six ship in the RSC payload at ~7.3 KB raw, ~2.5 KB
  compressed. Not worth deferring.
- **`lucide-react` is fine.** Next 15's `optimizePackageImports` covers it by default; the
  named imports don't pull the barrel.
- **DOM size is fine.** 171 elements, depth 12, max 28 children. Lighthouse lists this
  unscored and it isn't costing anything — the depth-12 path it names is just the R3F canvas
  wrapper.
- **The 12 KiB of legacy JavaScript is Next's, not yours** (#8), and there is no supported way
  to remove it. Ignore it.
- **Accessibility 96 / Best Practices 100 / SEO 100.** The report as pasted doesn't name the
  failing a11y audit; it's the same 96 the home page scores, so it is likely something in the
  shared layout rather than on this page.
