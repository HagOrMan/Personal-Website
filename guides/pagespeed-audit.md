# PageSpeed Audit — Home Page (`/`)

**Run:** Aug 26, 2026, 10:49 AM EDT · Lighthouse 13.4.1 · Emulated Moto G Power · Slow 4G · HeadlessChromium 151

| Metric | Value | Verdict |
| --- | --- | --- |
| Performance | **46** | bad |
| First Contentful Paint | 0.9 s | good |
| Largest Contentful Paint | 4.3 s | bad |
| Total Blocking Time | **22,800 ms** | catastrophic |
| Cumulative Layout Shift | 0.019 | good |
| Speed Index | **15.4 s** | bad |
| Accessibility / Best Practices / SEO | 96 / 100 / 100 | fine |

Only `/` scores like this. Every other route (`/about-me`, `/projects`, `/experience`,
`/contact`, `/resume`) also runs a Three.js canvas — but a small one, and none of them
stack a scroll-driven layout animation and a scripted auto-scroll on top of it.
See [Why only the home page](#why-only-the-home-page).

---

## Read the numbers first

Two lines in the report tell you almost the whole story, and they point away from the
usual suspects (bundle size, images, CSS):

**1. Main-thread work is 41.1 s, but script evaluation is only 707 ms.**

| Category | Time |
| --- | --- |
| **Other** | **40,079 ms** |
| Script Evaluation | 707 ms |
| Style & Layout | 104 ms |
| Script Parsing & Compilation | 88 ms |
| Rendering | 70 ms |
| Parse HTML & CSS | 8 ms |

Your JavaScript costs 0.7 s to run. The other 40 s is per-frame render/raster work —
work the JS *commands* rather than work the JS *is*. Shipping a smaller bundle will
barely move this.

**2. The long tasks are still firing 34 seconds after navigation.**

```
 3,805 ms → 547 ms   ┐ initial load burst
 4,352 ms → 382 ms   │
 4,734 ms → 269 ms   ┘
18,778 ms → 273 ms   ┐
23,384 ms → 267 ms   │
25,257 ms → 282 ms   │
25,700 ms → 298 ms   │
26,139 ms → 290 ms   │  steady state:
26,577 ms → 292 ms   │  ~300 ms of main-thread work
26,869 ms → 275 ms   ├─ every ~400–500 ms,
28,067 ms → 344 ms   │  with no user interaction,
28,573 ms → 298 ms   │  15+ seconds after the page
29,005 ms → 327 ms   │  finished loading
29,491 ms → 389 ms   │
30,026 ms → 318 ms   │
30,499 ms → 340 ms   │
31,016 ms → 384 ms   │
31,606 ms → 421 ms   │
33,381 ms → 311 ms   │
33,826 ms → 301 ms   ┘
```

Nothing on a portfolio homepage should be doing 300 ms of work half a minute after
load. This is a render loop that never stops, and it is the direct cause of the 22.8 s
TBT: Lighthouse ends its trace when the main thread goes quiet, the main thread never
goes quiet, so the trace ran to its ceiling and **every** long frame in that whole
35-second window was counted as blocking time.

The same never-idle loop is why Speed Index is 15.4 s. SI measures how quickly the
viewport reaches its final visual state; a canvas that is still animating at second 34
means the page is never visually "done."

> **One honest caveat.** Lighthouse-as-a-service runs headless Chrome with no GPU, so
> WebGL rasterizes on the CPU via SwiftShader. A real visitor with a real GPU will not
> see a 22.8 s TBT. But the score you are being graded on is this one, and the loop is
> genuinely burning CPU and battery for real users too — it just doesn't cost them
> 300 ms a frame.

---

## Root causes, ranked

### 1. The ocean canvas renders 33,153 particles, forever · `src/components/backgrounds/OceanParticles.tsx`

**Owns:** TBT 22,800 ms · main-thread 41.1 s · Speed Index 15.4 s · all 20 long tasks

Three compounding problems in one component:

**a) The particle count.** `OceanParticles.tsx:288`

```tsx
<planeGeometry args={[12, 12, 256, 128]} />
```

`256 × 128` segments is `257 × 129 = 33,153` vertices, each drawn as a point. Compare
`WaveSpray`, which every other page uses: `CORE_COUNT = 800` + `SPRAY_COUNT = 750` =
**1,550 particles** (`Wavespray.tsx:56-57`). The home page draws **21× more geometry**.

**b) The fill rate.** The canvas is `absolute inset-0` inside an `h-dvh` sticky
container (`page.tsx:199-202`), so it covers the entire viewport — ~412 × 915 CSS px at
DPR 1.75 ≈ 1.15 M device pixels. The fragment shader (`OceanParticles.tsx:101-127`) uses
`discard` and additive blending, both of which defeat early-Z and force heavy overdraw:
every one of those 33 k glowing points blends against everything behind it.
`discard` in particular disables the GPU's early depth-test fast path.

**c) It never stops.** R3F's `<Canvas>` defaults to `frameloop="always"`, so `useFrame`
(`OceanParticles.tsx:224`) runs at ~60 fps for as long as the component is mounted —
including the entire time the canvas is scrolled off-screen behind
`ReferencesSection`, and including the 30 seconds after Lighthouse thinks the page is
done. Nothing pauses it: not `IntersectionObserver`, not `visibilitychange`, not
`prefers-reduced-motion`.

**Also in this file:** `<OrbitControls>` (`:338`) and the invisible raycast hitbox mesh
(`:304-313`) each pull extra weight for a decorative background — drei's OrbitControls
is a meaningful chunk on its own, and the hitbox makes R3F raycast on pointer events.

---

### 2. The LCP element is deliberately invisible until a timer fires · `src/app/page.tsx`

**Owns:** LCP 4.3 s

Lighthouse names the LCP element explicitly:

```
Element render delay        5,410 ms
Time to first byte              0 ms
"I genuinely care about building robust, maintainable systems that never surpris…"  <p>
```

TTFB is **zero**. The network did nothing wrong. That paragraph sat there, painted at
`opacity: 0`, for 5.4 seconds — because that is exactly what the code asks for.

The `<p>` lives inside a motion div driven by scroll progress (`page.tsx:228-231`):

```tsx
const descriptionOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
```

It stays at opacity 0 until the page is scrolled 30% through the 200vh track. An element
at opacity 0 is not LCP-eligible, so LCP cannot fire until something scrolls the page.
The only thing that does is the auto-scroll (`page.tsx:143-184`):

```tsx
const startTimeout = setTimeout(() => {          // 2,000 ms of nothing
  const controls = animate(0, targetY, {
    duration: 3,                                  // then 3,000 ms of scrolling
    onUpdate: (value) => window.scrollTo(0, value),
  });
}, 2000);
```

2,000 ms delay + partway into a 3,000 ms scroll ≈ the 4.3 s LCP and the 5,410 ms render
delay. **Your LCP is gated on a `setTimeout`.** No amount of bundle-splitting, image
compression, or CDN tuning will fix it while that gate is there.

(The 4.3 s headline and the 5,410 ms breakdown differ because one is Lighthouse's
simulated value and the other is the observed trace value. Same cause.)

---

### 3. The scroll animation drives layout-and-paint properties, once per frame · `page.tsx` + `LiquidGlassCard.tsx`

**Owns:** CLS 0.019 · Style & Layout 104 ms · inflates every frame during the auto-scroll

Lighthouse's CLS culprit list names the same element five times:

```
<div class="relative overflow-hidden rounded-3xl border border-solid pointer-events-au…">
```

That is `LiquidGlassCard`. The scroll transforms feed it `width` and `height`
(`page.tsx:93-105`, applied at `:215`):

```tsx
const cardHeight = useTransform(scrollYProgress, [0, 0.3, 0.5],
  isDesktop ? ['200px', '300px', '450px'] : ['180px', '320px', '560px']);
const cardWidth  = useTransform(scrollYProgress, [0, 0.3, 0.5],
  isDesktop ? ['300px', '400px', '550px'] : ['75vw', '85vw', '90vw']);
```

`width` and `height` are layout properties. Animating them re-runs layout on every
frame and shifts the content around them — hence the shifts. `transform: scale()` on a
fixed-size box, or animating `max-height`/`clip-path`, would compose on the GPU instead.

Worse, `LiquidGlassCard` simultaneously animates **`backdrop-filter: blur()`**
(`LiquidGlassCard.tsx:98, 118-119`) plus a `color-mix()` gradient background
(`:83-88`), a `box-shadow` (`:95`), a `border-color` (`:92`), and a second radial
gradient on an inner overlay (`:101-105, 128-131`). Animated `backdrop-filter` is one of
the most expensive things you can put on a page: the browser must re-sample and
re-blur everything behind the element every frame. And behind it is the WebGL canvas
from problem #1, which is also repainting every frame.

So during the 3-second auto-scroll, each frame does: layout (width/height change) →
repaint the canvas → re-blur the backdrop over the changed canvas → re-composite. On a
CPU-rasterized WebGL context, that is the 300–550 ms frames in the load burst.

**Note:** `useMediaQuery` (`src/lib/screenUtils.ts:4-18`) returns `false` on the server
and on the first client render, so `isDesktop` is briefly wrong on desktop and the whole
transform set swaps values after hydration. It also lists `matches` in its own dependency
array (`:15`), which tears down and re-subscribes the listener on every change.

---

### 4. Three.js ships in the initial bundle for a decorative background

**Owns:** "Reduce unused JavaScript — 130 KiB"

```
chunks/e8867c6f-…js   100.1 KiB   83.1 KiB unused    ← ~83% unused, almost certainly three
chunks/7566a6ad-…js    85.2 KiB   23.9 KiB unused
chunks/3166-…js        41.5 KiB   23.2 KiB unused    ← the chunk in all 20 long tasks
```

`next/dynamic` is used **nowhere in the codebase** (verified by grep). `src/app/page.tsx`
is `'use client'` at the top, and it statically imports:

- `OceanScene` → `three` + `@react-three/fiber` + `@react-three/drei` (`page.tsx:12`)
- `VideoModalShell` → `VideoExperience` + the full Radix Dialog tree + `constant/transcripts.ts`
  (`page.tsx:19`) — all downloaded and parsed even though `videoOpen` starts `false` and
  most visitors never open the modal

Chunk `3166` appearing in every single long task is consistent with it being the
animation runtime (three's render path or motion's frame loop) — the code that executes
each frame of problem #1.

---

### 5. The hero photo is oversized, over-quality, and lazy · `page.tsx:320-327`

**Owns:** "Improve image delivery — 68 KiB"

```
Downloaded:  /_next/image?url=/me/me-and-rocky.jpg&w=384&q=90   77.8 KiB
Needed for:  213 × 284 device px   (browser fetched 371 × 512)
Savings:     53.1 KiB right-sizing  +  46.8 KiB compression
```

Three separate issues:

1. **`sizes` overstates the box.** It declares `170px` below 768px (`:324`), but at a
   412px viewport the rendered image is ~119 CSS px wide (`min-[390px]:w-[135px]` minus
   the wrapper's `p-2`). 170 × 1.75 DPR = 297 → browser picks the `384w` candidate when
   `256w` would do.
2. **`quality={90}`** (`:325`) on a photo displayed at ~119 px. Next's default of 75 is
   visually identical at that size.
3. **`loading="lazy"`** — there's no `priority` prop, so Next lazy-loads it, but the
   photo is inside the initial viewport. It's not the LCP element (that's the `<p>`), so
   this is minor, but it delays the image for no gain.

**Separately:** the source files are enormous — `public/me/me-and-rocky.jpg` is **2.8 MB**
and `personal-photo.jpg` is **2.5 MB**. Next's optimizer handles this at request time so
visitors don't pay it, but every cold optimization does real work, and both are in git.

---

### 6. Render-blocking CSS · `src/app/globals.css`

**Owns:** "Render-blocking requests — 600 ms" · FCP

```
css/b496025c9cd768cc.css    1.3 KiB    150 ms
css/1777b40ce2dc5a9b.css   17.9 KiB    600 ms    ← this one
Maximum critical path latency: 899 ms
```

`globals.css` is 24 KB of source (765 lines) and compiles to a single 17.9 KB stylesheet
that every route shares and that blocks first paint. On Slow 4G that's 600 ms of pure
wait. FCP is still 0.9 s, so this is the least urgent item on the list — but it's 600 ms
sitting directly in front of every metric downstream of it.

---

### 7. Legacy JavaScript polyfills · no `browserslist` config

**Owns:** "Legacy JavaScript — 12 KiB"

```
chunks/4334-…js   11.6 KiB wasted
  Array.prototype.at · Array.prototype.flat · Array.prototype.flatMap
  Object.fromEntries · Object.hasOwn
  String.prototype.trimStart · String.prototype.trimEnd
```

`package.json` has no `browserslist` field, so Next.js falls back to its default target
and ships polyfills for features every browser has supported since 2021. Cheapest fix in
this document.

---

### 8. Unused preconnect · `src/components/video/VideoModalShell.tsx:44-49`

> `https://media.kylehagerman.dev` — Unused preconnect. Only use `preconnect` for origins
> the page is likely to request.

The `preconnect()` call fires on mount for a video host that is only hit if the visitor
opens the modal. The comment in that file argues it "costs nothing," which is nearly
true — but it does hold an idle socket and Lighthouse flags it. Worth moving to the same
hover/focus intent path that already triggers `primeVideoPlayback`.

---

## Why only the home page

| | `/` | `/about-me`, `/projects`, `/experience`, `/resume` |
| --- | --- | --- |
| WebGL particles | **33,153** | 1,550 (`WaveSpray`) |
| Canvas area | full viewport (`inset-0`, `h-dvh`) | banner strip |
| Blending | additive + `discard` (heavy overdraw) | same shader family, far less area |
| `OrbitControls` + raycast hitbox | yes | no |
| Scroll-driven `width`/`height` animation | yes | no |
| Animated `backdrop-filter` over the canvas | yes | no |
| Scripted 3 s auto-scroll | yes | no |
| LCP element gated behind scroll progress | yes | no |

Same rendering technology, ~21× the geometry, over the whole viewport, with three more
per-frame systems layered on top.

---

## Fix plan

### Tier 1 — the score is here

**1.1 Stop the render loop when it isn't visible.** Biggest single win; nothing else
comes close. Set `frameloop="demand"` and drive frames manually, or gate on visibility:

```tsx
// OceanParticles.tsx — pause useFrame when off-screen, hidden, or reduced-motion
const active = useIsVisible(containerRef) && !document.hidden && !prefersReducedMotion;
useFrame((state, delta) => {
  if (!active) return;
  // …
});
```

Add an `IntersectionObserver` on the wrapper, a `visibilitychange` listener, and a
`usePrefersReducedMotion()` check (the hook already exists in `src/lib/screenUtils.ts:21`).
This alone should take TBT from 22,800 ms to something in the hundreds and let Lighthouse's
trace actually terminate — which fixes Speed Index as a side effect.

**1.2 Ungate the LCP element.** Make the bio paragraph visible at rest and let scroll
*enhance* it, not reveal it. Either start `descriptionOpacity` at 1 and animate something
non-blocking, or change the range so it's visible from `scrollYProgress = 0`. If you want
to keep the reveal, at minimum skip it for `prefers-reduced-motion` and shorten the 2 s
`setTimeout` (`page.tsx:145`) — but the clean fix is not gating your largest text on a timer.

**1.3 Cut the particle count.** `256 × 128` → `128 × 64` is 8,385 particles (a 4× cut) and
at a 6 px point size on a 412 px-wide screen the difference is close to invisible. Consider
scaling by viewport: mobile doesn't need desktop density.

### Tier 2 — real wins, more work

**2.1 Lazy-load the canvas.**

```tsx
const OceanScene = dynamic(
  () => import('@/components/backgrounds/OceanParticles').then(m => m.OceanScene),
  { ssr: false, loading: () => <div className='h-full w-full' /> },
);
```

Takes ~100 KiB of three/R3F/drei out of the critical path. Do the same for
`VideoModalShell` — mount it only once `videoOpen` first flips true.

**2.2 Stop animating layout and backdrop-filter together.** Replace the `width`/`height`
motion values (`page.tsx:93-105`) with a fixed-size card and a `transform: scale()`, and
either freeze `backdrop-filter` at one value or drop the blur while the card is in motion.
Fixes CLS and removes the per-frame re-blur over the canvas.

**2.3 Drop `OrbitControls` and the raycast hitbox** from the background, or import
OrbitControls lazily. A decorative ocean doesn't need orbit + click-ripple on a phone.

### Tier 3 — quick, cheap, do them while you're in there

- **`sizes`** → `(min-width: 1024px) 300px, (min-width: 768px) 260px, 135px` (`page.tsx:324`)
- **`quality={90}` → `quality={75}`** (`page.tsx:325`)
- **Add `priority`** to the hero photo since it's in the initial viewport (`page.tsx:320`)
- **Recompress the sources** — 2.8 MB and 2.5 MB JPEGs in `public/me/` should be a few hundred KB
- **Add `browserslist`** to `package.json` to drop the 12 KiB of polyfills:
  ```json
  "browserslist": ["chrome >= 111", "safari >= 16.4", "firefox >= 128", "edge >= 111"]
  ```
- **Move the `preconnect`** (`VideoModalShell.tsx:44`) onto the hover/focus intent path
- **Fix `useMediaQuery`** (`screenUtils.ts:15`) — drop `matches` from the dependency array

### Expected outcome

Tier 1 alone should be the difference between 46 and something in the 80s: TBT and Speed
Index both collapse when the loop stops, LCP drops to roughly FCP when the paragraph is
no longer gated, and those four metrics are ~85% of the Performance score. Tier 2 and 3
are what carry it into the 90s.

---

## Changes applied

### The render loop now stops · `OceanParticles.tsx`, `screenUtils.ts`

New `useIsOnScreen(ref)` hook (`src/lib/screenUtils.ts`) combining an `IntersectionObserver`
(128px `rootMargin`, so it resumes just before scrolling back in) with `visibilitychange`.
`OceanScene` feeds it into R3F's `frameloop`:

| State | `frameloop` | Effect |
| --- | --- | --- |
| Scrolled past / backgrounded tab | `never` | No frames at all |
| `prefers-reduced-motion` | `demand` | One static frame |
| Visible, motion welcome | `always` | The ocean as designed |

**This had to be `frameloop`, not an early return from `useFrame`.** R3F calls
`gl.render()` every tick regardless of what the frame subscriptions do, and drawing the
points *is* the cost — skipping the uniform updates would have saved nothing.

Two consequences that needed handling so behaviour stays identical:

- Under `demand` there is only one frame, so every lerp would freeze 5% of the way to
  its target. `WaveParticles` takes a `snap` prop that collapses each easing factor to 1.
- Theme targets live in refs, so React never re-renders and R3F never learns anything
  changed — a theme switch under `demand` would keep the old colours. The theme effect
  now ends with `invalidate()` (a no-op under `always`).

### Mobile particle density · `OceanParticles.tsx`

`DESKTOP_SEGMENTS = [256, 128]` (unchanged, 33,153 points) / `MOBILE_SEGMENTS = [128, 64]`
(8,385 points). Resolved **once** at mount via `window.matchMedia`, not `useMediaQuery` —
changing it later would rebuild the whole vertex buffer, and the component is client-only
now so there's no hydration mismatch to start `false` for.

### LCP is no longer gated on a timer · `page.tsx`

- Delay `2000ms` → **`500ms`** (`AUTO_SCROLL_START_DELAY_MS`).
- `prefers-reduced-motion` skips the animated scroll entirely and lands on the same end
  state instantly — same result, none of the travel.
- **Auto-scroll target rewritten.** It was `window.innerHeight * 0.8`, which fell short on
  phones: `vh` units resolve against the *large* viewport while `innerHeight` is the
  smaller visible one, so 0.8 viewport-heights covered less of a 200vh track than
  intended and left the photo part-transparent. `getAutoScrollTarget()` now inverts the
  `useScroll` offset against the track's real `getBoundingClientRect()` and targets
  `AUTO_SCROLL_TARGET_PROGRESS = 0.85` — expressed in the same 0–1 space the animations
  read from, so it lands past the photo's fade (0.7 mobile / 0.6 desktop) on any viewport.
- **The home page always starts at the top.** `history.scrollRestoration` goes to
  `'manual'` while this page is mounted (handed back on unmount, so the rest of the site
  keeps normal back/forward restoration) plus a `scrollTo(0, 0)`. The hero is a scripted
  intro that plays from the top, so a reload that restored the previous offset dropped
  the visitor at the end of an animation they never saw.

  A conditional version of this was built and then removed — remembering the offset in
  `sessionStorage` so a reload from past the hero left the visitor untouched. It worked,
  but it needed `pagehide` bookkeeping, a `PerformanceNavigationTiming` check to tell a
  reload from a fresh arrival, and it still had a StrictMode-shaped edge case. Not worth
  the surface area for the behaviour it bought.
- The animation starts from a hard `0` rather than the live scroll position — at the
  point it fires, the mount effect has already put the visitor at the top, and any manual
  scroll would have cancelled it outright.
- The wheel/touchstart interrupt is attached **immediately** rather than when the
  animation starts, and it cancels the pending timeout too. Someone who scrolls during
  the delay has said they don't want to be driven, so the intro bows out entirely instead
  of starting up underneath them — which is also what makes starting from `0` safe.
- `getScrollForProgress` is declared **above** the effects that use it. A `const` named in
  a dependency array is read during render, so a later declaration is a temporal-dead-zone
  `ReferenceError`, not a lint nit.

### The card's resting size flashed on desktop · `page.tsx`

The server has no viewport, so `isDesktop` is `false` through SSR and the first client
render — and Motion serialises a MotionValue's current value into the SSR'd `style`
attribute. Desktop visitors got `width: 75vw` in the HTML, painted a ~1080px-wide card
with its text hard against the left edge, and watched it snap to `300px` once the media
query resolved. Mobile never saw it, because `false` was the right answer there.

Making `useMediaQuery` smarter can't fix this — the wrong value is in HTML the server has
already sent, on screen before any JS runs. So the resting size now comes from classes
(`h-[180px] w-[75vw] lg:h-[200px] lg:w-[300px]`), which the browser resolves at the right
breakpoint pre-JS, and Motion only takes `width`/`height` over once a `hydrated` flag
flips. `isDesktop` resolves in the same effect flush, so there's no intermediate render at
the wrong size.

The cost: the resting dimensions now live in two places. They have to stay in step with
the first stop of `cardHeight`/`cardWidth`.

### Sub-pixel shake during the auto-scroll · `page.tsx`

Text inside the hero jittered up and down by a fraction of a pixel for the whole run of
the scroll animation. `animate` emits floats and `onUpdate` passed them straight to
`window.scrollTo`, and the hero lives in a `position: sticky` container — the browser
recomputes that element's offset from the scroll position every frame, so a fractional
`scrollY` makes the rounding land differently frame to frame and everything inside the
card moves with it.

`Math.round(value)` in `onUpdate`. At roughly 4px of travel per frame, rounding costs
nothing in smoothness.

### The hero heading shook on mobile · `page.tsx`

`"Hey! I'm Kyle"` at `text-4xl` measures roughly 240px. The card's content box starts at
`75vw` minus 32px of padding — about 238px on a 360px phone — so the heading sat exactly
on its wrap threshold, and "Kyle" flipped between line one and line two as the animating
width crossed back and forth. Reads as a vertical shake for the whole run of the
animation.

`whitespace-nowrap` on the `h1`. The content div already has `overflow-hidden`, so on very
narrow screens the tail is revealed as the card grows rather than wrapping. Desktop is
unaffected — the heading never came close to wrapping in a 300px card.

Note this is the narrow fix. The general version — giving the content div a fixed width
equal to its final one, so nothing inside re-lays-out as the card animates — would also
stop the bio paragraph re-wrapping every frame (a real per-frame cost, since text layout
is the expensive part), but it changes the desktop bio from re-wrapping to being revealed
by clipping. Not done.

### CLOSED (environmental): a vertical bob in the hero text

Not a code bug. Recorded in full because it cost a day and the next person to see it
should not repeat the hunt.

**Symptom.** The hero text bobs vertically by a small amount while scrolling through the
hero, on both the auto-scroll and manual scroll. Steady-rate rather than scaling with
scroll speed. Seen in an iPhone emulator.

**Resolution.** Bisected to nothing. `a39f89e` is the commit live in production. That
commit *does* bob when built and served locally (`pnpm build && pnpm start`) and *does
not* bob on the deployed site — same code, same browser, same machine. The variable is
the serving environment, not the source. Local-only sub-pixel jitter of a
`position: sticky` element under emulated device-pixel-ratio scaling is the likeliest
explanation and there is nothing to fix in the repo.

**If a real visitor ever reports it**, that changes the picture and the place to start is
the sticky container in `page.tsx` (`sticky top-10 … h-dvh`), not the card.

**Ruled out by direct test** (all of these were dead ends — kept as a record of what the
bob is *not*):

| Suspect | Test | Result |
| --- | --- | --- |
| Card size animation | Removed `height`/`width` from the card's motion `style` (CSS classes hold the resting size) | Still bobs |
| Animated `backdrop-filter` | Commented out `backdropFilter` / `WebkitBackdropFilter` in `LiquidGlassCard` | Still bobs |
| `glitch-skew` keyframes | Read them — `skew()` only, no translate, and only during a glitch burst | Can't cause it |
| Glitch scramble reflow | `whitespace-nowrap` on `GlitchTextCycle`'s root | Not the cause; reverted (the multi-line wrap is wanted for the effect) |

**What the first two results imply.** With a static card and no backdrop filter, nothing
inside the card is moving the text relative to the card — so the whole sticky container
must be moving relative to the viewport. That points at compositing or scroll handling,
not at anything in the card's own subtree.

**What the diff says.** `git diff HEAD -- src/app/page.tsx` over the sticky container and
its ancestors (`sticky`, `h-dvh`, `h-[200vh]`, `mt-12`, `absolute inset-0`, `max-w-7xl`)
returns nothing but a comment. No layout markup in the hero changed in this work.

**The lesson.** Three separate code changes were made chasing this, each on a plausible
theory, before anyone controlled for the environment. The comparison being used the whole
time — "it's fine on the deployed site" — was dev-build-plus-new-code against
prod-build-plus-old-code, two variables at once. Building the *live* commit locally was
the check that ended it, and it should have been the first one, not the last.

### Back navigation to `/` was broken · `page.tsx`

Pre-existing, found while working on the scroll behaviour and unrelated to any of it.
Navigating away from the home page and pressing Back changed the URL and re-rendered
nothing.

`page.tsx`'s mount effect called `window.history.replaceState(null, '', '/')` to strip a
stale `?clicks=N`. Next stores its router tree on the history entry, and its popstate
handler (`next/dist/client/components/app-router.js`) opens with:

```js
const onPopState = (event) => {
  if (!event.state) return;                                    // ← silently does nothing
  if (!event.state.__NA) { window.location.reload(); return; }
  startTransition(() => dispatchTraverseAction(/* ...tree */));
};
```

Nulling the state made the home entry unrecoverable. Next *does* patch
`history.replaceState` to copy `__NA` and `__PRIVATE_NEXTJS_INTERNALS_TREE` forward — but
it installs that patch in the AppRouter's own `useEffect`, and child effects run before
parent effects, so a mount effect in a page component gets the **native**
`replaceState`. Now passes `window.history.state` through.

The two other `replaceState(null, …)` calls in the codebase — `BlogIndexClient.tsx:131`
and `ProjectsClient.tsx:50` — are fine as they are: both run from event handlers, long
after the patch is installed, so Next copies its state forward for them. The same is true
of the `?clicks=` call further down `page.tsx`, which is guarded by `if (clickCount === 0)
return`. Only a mount effect hits the unpatched window.
- **Fixed a latent leak:** the cleanup was being returned from inside the `setTimeout`
  callback, where React never saw it — the wheel/touchstart listeners and a running
  animation outlived the component.

### Code splitting · `page.tsx`, `OceanParticles.tsx`

- `OceanScene` → `next/dynamic` with `ssr: false`. It already fades itself in on
  `onCreated`, so a late mount is invisible.
- `VideoModalShell` → `next/dynamic`, and it now mounts only on first open
  (`videoMounted`, which latches true so the exit animation still has something to play
  on). `primeVideo` warms the chunk **and** the media origin on `onPointerEnter`/`onFocus`
  at both triggers, so the tap that opens it isn't waiting on a download.
- This also resolves the **unused preconnect** finding for free: the `preconnect()` that
  fired from inside `VideoModalShell` on mount now only runs on deliberate intent.
  `VideoModalShell` itself is untouched, so `/about-me`'s usage is unaffected.
- `OrbitControls` deep-imported and `lazy()`-loaded from
  `@react-three/drei/core/OrbitControls` (not the barrel — that would pull all of drei
  into the chunk), wrapped in `<Suspense>` inside `<Canvas>`.

### Image delivery · `page.tsx`

`sizes` was a blanket `170px` below 768px for a box that renders at ~120 CSS px — that
overstatement is what made phones fetch the `384w` candidate. Now matched per breakpoint,
minus the 16px the wrapper's `p-2` takes off:

```
(min-width: 1024px) 300px, (min-width: 768px) 244px,
(min-width: 450px) 222px, (min-width: 390px) 120px, 96px
```

Plus `quality={90}` → `75` and `priority` added (it's in the initial viewport, just
transparent until the scroll reveals it, so lazy-loading bought nothing).

### Polyfills · `package.json`

```json
"browserslist": ["chrome >= 111", "edge >= 111", "firefox >= 128", "safari >= 16.4", "ios_saf >= 16.4"]
```

This is Tailwind v4's own baseline, so it isn't actually aggressive — the site already
uses `color-mix()` and `@property`, which means browsers below this line can't render it
correctly regardless.

### `useMediaQuery` · `screenUtils.ts`

Dropped `matches` from the dependency array (it tore down and re-subscribed the listener
on every change) and seeded from the real value on mount.

### `LiquidGlassCard` — what was *not* done, and why

The original plan was to replace the `width`/`height` motion values with a fixed-size box
and `transform: scale()`. **Skipped deliberately**, for two reasons:

1. `scale()` scales the *contents* — the heading, glitch text and bio would grow and
   shrink with the card. That is a visible change, not a refactor.
2. **CLS was already scoring 25/25.** The 0.019 buys nothing back; the width animation is
   a correctness nit, not a score problem.

What *was* done is the part that actually costs: `backdrop-filter` is now `none` (not
`blur(0px)`) while the card is hidden, so it isn't a backdrop root over the live canvas
before it's needed, and the radius is rounded to whole pixels so each frame isn't a fresh
blur kernel. Both are imperceptible.

### The second never-idle loop · `GlitchTextCycle.tsx`

The glitch cycle fired ~20 `setState`-driven re-renders per 500 ms transition, every 3 s,
for as long as the component was mounted — plus three infinite CSS `glitch-bar` animations
during each burst (Lighthouse listed them among the layout-shift culprits). The bursts are
short enough not to create long tasks, so this was not costing TBT directly, but it never
let the page go idle either.

Same `useIsOnScreen` gate: the cycling interval is only scheduled while the text is on
screen and the tab is foregrounded.

One thing that needed care. `startGlitch` only tidies up on its own final step, so tearing
the interval down mid-scramble would have frozen the text on glitch characters — visible
the moment it scrolled back in. The cleanup now settles back onto the current real word
(`wordsRef.current[currentIndexRef.current]`) whenever it interrupts a transition in
progress.

**Also fixed here, unrelated to performance:** `page.tsx` passed
`words={['Developer', 'Innovator', 'Creator']}` as an inline literal, so the array's
identity changed on every parent re-render and `GlitchTextCycle`'s
`useEffect(() => setDisplayText(words[0]), [words])` fired each time — snapping the visible
word back to "Developer" while `currentIndexRef` kept counting independently, so the two
drifted apart. The array is now a module constant (`HERO_GLITCH_WORDS`), and that reset
effect resets the index alongside the text so a genuinely new word list restarts cleanly
rather than transitioning away from whichever word a stale index pointed at.

### Still open

- **Render-blocking CSS** (600 ms, `1777b40ce2dc5a9b.css`). Untouched — FCP is already
  0.9 s and this is the lowest-leverage item in the report.
- ~~**Source image recompression**~~ — done. `me-and-rocky.jpg` 2.8 MB → 364 KB,
  `personal-photo.jpg` 2.5 MB → 323 KB. Commands kept below for the next photo.
- **Reduced motion for the glitch itself.** Deliberately left alone — unlike the ocean,
  the glitch *is* the component's content rather than decoration around it, so freezing it
  on "Developer" is a product call, not a perf one.

### Source image recompression (run locally)

Both files in `public/me/` are far larger than anything they're served at.
`me-and-rocky.jpg` is **2.8 MB** and `personal-photo.jpg` is **2.5 MB**; the largest
rendered size is 300 CSS px, so ~1200px wide covers DPR 3 with room over. Next optimises
at request time either way, so this is about repo size and cold-optimisation cost, not
visitor bytes.

```bash
# Check what you're starting from
ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=p=0 public/me/me-and-rocky.jpg

# Cap at 1200px wide, keep aspect (-2 keeps the height even), strip metadata.
# -q:v is 2-31, lower is better; 4 is high quality, try 5-6 if you want smaller.
ffmpeg -i public/me/me-and-rocky.jpg  -vf "scale='min(1200,iw)':-2" \
  -q:v 4 -map_metadata -1 public/me/me-and-rocky.opt.jpg
ffmpeg -i public/me/personal-photo.jpg -vf "scale='min(1200,iw)':-2" \
  -q:v 4 -map_metadata -1 public/me/personal-photo.opt.jpg

# Compare, eyeball the .opt.jpg files, then swap them in
ls -la public/me/
mv public/me/me-and-rocky.opt.jpg  public/me/me-and-rocky.jpg
mv public/me/personal-photo.opt.jpg public/me/personal-photo.jpg
```

`personal-photo.jpg` has no references anywhere in `src/` — worth confirming it's still
wanted before spending effort on it.

---

## Appendix: what is *not* wrong

Worth stating plainly, because these are the things people usually reach for first:

- **TTFB is 0 ms.** Hosting and server rendering are fine.
- **FCP is 0.9 s.** First paint is fast.
- **CLS is 0.019.** Well under the 0.1 threshold — the shifts are real and worth fixing
  as a side effect of #3, but they are not costing you score.
- **Total transfer is small.** 226.8 KiB of JS across the flagged chunks is unremarkable.
  You do not have a payload problem; you have a *per-frame work* problem.
- **Accessibility 96 / Best Practices 100 / SEO 100.** Nothing to do here.
