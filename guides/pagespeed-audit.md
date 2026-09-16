# PageSpeed Audit — Home Page (`/`)

**Run:** Sep 4, 2026, 5:29 PM EDT · Lighthouse 13.4.1 · Emulated Moto G Power · Slow 4G · HeadlessChromium 151
**Previous run:** Aug 26, 2026 — see [History](#history-the-aug-26-round) for what changed in between.

| Metric                               | Aug 26         | Sep 4          | Change   | Points     |
| ------------------------------------ | -------------- | -------------- | -------- | ---------- |
| **Performance**                      | 46             | **44**         | −2       |            |
| First Contentful Paint               | 0.9 s          | 0.9 s          | —        | 10 / 10    |
| Largest Contentful Paint             | 4.3 s          | **4.6 s**      | +0.3 s   | **9 / 25** |
| Total Blocking Time                  | 22,800 ms      | **8,760 ms**   | **−62%** | **0 / 30** |
| Cumulative Layout Shift              | 0.019          | 0.012          | −37%     | 25 / 25    |
| Speed Index                          | 15.4 s         | **12.1 s**     | **−21%** | **0 / 10** |
| Accessibility / Best Practices / SEO | 96 / 100 / 100 | 96 / 100 / 100 | —        |            |

---

## Read this first: the score didn't drop, it didn't move

The 2-point difference is **entirely** LCP going 4.3 s → 4.6 s. Nothing else changed its
point value. Lighthouse hands you the arithmetic in the report header:

```
44  =  FCP +10  ·  LCP +9  ·  TBT +0  ·  CLS +25  ·  SI +0
46  =  FCP +10  ·  LCP +11 ·  TBT +0  ·  CLS +25  ·  SI +0     (Aug 26)
```

TBT fell by 14 seconds and Speed Index by 3.3 seconds, and both were worth **zero points
before and zero points after**. That isn't the fixes failing — it's the fixes landing inside
a band where the scoring curve is already flat:

| Metric      | Scores 0 above | You are at | Need, for even 1 point |
| ----------- | -------------- | ---------- | ---------------------- |
| TBT         | ~3,300 ms      | 8,760 ms   | under ~3,000 ms        |
| Speed Index | ~12 s          | 12.1 s     | under ~11.5 s          |

Speed Index is sitting _directly on_ the zero boundary. TBT is still 2.6× past it.

**So the honest read is: the previous round did real work, and none of it was enough to cross
a threshold.** The rest of this document is about which thresholds are reachable and what it
costs to cross them. The short version:

- **Ungating LCP is worth ~+16 points on its own**, and is a contained change.
- **Making the page go idle is worth up to +40** (TBT 30 + SI 10), and is the structural one.

---

## What the previous round actually bought

Verified against the live deployment, not assumed — the CSS and chunk hashes in the report
match what `https://www.kylehagerman.dev/` serves right now, so this is the same build.

| Fix                                                      | Verdict                    | Evidence                                                                                                                                                      |
| -------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code-split three / R3F / drei                            | **worked**                 | `e8867c6f`, `7566a6ad` (three), `179` (R3F) and `9067` are all absent from the SSR'd HTML's script list — they load on demand now, off the critical path      |
| Code-split the video modal                               | **worked**                 | same: nothing Radix-Dialog-shaped in the initial scripts                                                                                                      |
| Image `sizes` / `quality` / `priority`                   | **worked**                 | fetched candidate went `w=384 q=90` (77.8 KiB) → `w=256 q=75` (20.7 KiB), and there's no `loading="lazy"` on the tag. 7 KiB of compression savings left       |
| Source image recompression                               | **worked**                 | `me-and-rocky.jpg` 2.8 MB → 364 KB, `personal-photo.jpg` 2.5 MB → 323 KB                                                                                      |
| Move the video `preconnect` behind intent                | **worked**                 | "Unused preconnect" is gone; the report now says "no origins were preconnected"                                                                               |
| Mobile particle count 33,153 → 8,385                     | **helped**                 | part of the −14 s TBT, but it treated the symptom — see [#2](#2-the-visibility-gate-cannot-fire-on-this-page)                                                 |
| `backdrop-filter: none` while hidden, whole-pixel radius | **helped**                 | part of the −14 s TBT, but see [#1](#1-backdrop-filter-over-a-live-canvas-couples-two-60-fps-systems)                                                         |
| `frameloop` visibility gate on the ocean                 | **no effect on this page** | the canvas is inside a `sticky h-dvh` container — it never leaves the viewport, so the gate never fires                                                       |
| `useIsOnScreen` gate on `GlitchTextCycle`                | **no effect on this page** | same reason: the hero text is on screen for the whole trace                                                                                                   |
| Auto-scroll delay 2000 → 500 ms                          | **partial**                | LCP render delay 5,410 → 2,890 ms, but LCP itself got _worse_ (4.3 → 4.6 s). The gate is still there                                                          |
| `browserslist` in `package.json`                         | **no effect**              | identical chunk (`4334`), identical 11.6 KiB, identical feature list across both runs. See [#6](#6-the-polyfill-block-and-why-browserslist-couldnt-remove-it) |

Two patterns explain the whole result:

1. **Three of the fixes gated on visibility, and on this page nothing is ever invisible.** The
   hero lives in `sticky top-10 … h-dvh` inside a `200vh` track, so it is pinned to the
   viewport for the entire scroll. `useIsOnScreen` was the right instinct for the _other_
   routes and a no-op here.
2. **The fixes that helped all made each frame cheaper.** None of them made the frames
   _stop_, and the score is gated on stopping.

---

## Read the new numbers

### 1. Motion is on the stack for 85% of the main thread while executing 282 ms of its own JS

Main-thread work is 41.9 s against 2,217 ms of script evaluation — the same shape as last
time. The per-chunk breakdown is new, though, and it points somewhere unexpected:

| Chunk      | What it is (verified by fetching it)                    | Total CPU     | Script eval |
| ---------- | ------------------------------------------------------- | ------------- | ----------- |
| `3166`     | **Motion** (`MotionValue`, `motionValue`, `willChange`) | **35,670 ms** | 282 ms      |
| `179`      | `@react-three/fiber` + React scheduler                  | 3,618 ms      | 427 ms      |
| `4334`     | Next.js app-router client runtime                       | 1,192 ms      | 1,126 ms    |
| `1d1d8679` | —                                                       | 320 ms        | 157 ms      |
| `9067`     | —                                                       | 120 ms        | 119 ms      |

And the two three.js chunks — `e8867c6f` (100.1 KiB) and `7566a6ad` (85.2 KiB, the one
containing `WebGLRenderer`) — **do not appear in the CPU table at all.**

That inverts the previous audit's conclusion. The ocean canvas was blamed for everything; it
isn't the thing burning the main thread. R3F accounts for 3.6 s of a 41.9 s trace. Motion
accounts for 35.7 s while running 0.28 s of its own code.

A chunk with a huge CPU number and a tiny evaluation number is not doing work — it is
_scheduling_ work. Motion's frame loop commits style writes; the browser then does layout,
paint and composite, and that time is charged to the task Motion opened. So the question isn't
"why is Motion slow", it's **"what does Motion write to the DOM that is this expensive to
paint"** — which is [root cause #1](#1-backdrop-filter-over-a-live-canvas-couples-two-60-fps-systems).

### 2. The page still never goes idle

```
 4,420 ms → 258 ms   ┐ load burst
 4,678 ms → 167 ms   ┘
 8,146 ms → 120 ms   ┐
 8,658 ms → 139 ms   │
 8,851 ms → 120 ms   │
 9,024 ms → 129 ms   │  steady state:
 9,201 ms → 113 ms   ├─ ~120 ms of main-thread work
 9,314 ms → 144 ms   │  every ~200 ms, no user
 9,523 ms → 135 ms   │  interaction, and still
 9,706 ms → 123 ms   │  going at second 34
10,055 ms → 126 ms   │
28,390 ms → 116 ms   │
33,016 ms → 120 ms   │
33,950 ms → 139 ms   ┘
```

Frames got ~2.5× cheaper (300-550 ms → 113-258 ms). They did not stop. Lighthouse ends a
trace when the main thread and the network both go quiet; neither does, so the trace runs to
its ceiling and every long frame in a 34-second window counts as blocking time. **That is why
TBT is 8,760 ms and Speed Index is 12.1 s, and why both are still worth zero points.**

### 3. There is a 19-second third-party request chain that is not in your code

New since Aug 26, and the largest single line in the report:

```
Maximum critical path latency: 19,192 ms

Initial Navigation  https://www.kylehagerman.dev — 86 ms, 9.52 KiB
  …v2/collector (collector-pxebumdlwe.pxchk.net)     —    217 ms, 0.00 KiB
  /b/s          (collector-pxebumdlwe.pxchk.net)     —  1,196 ms, 0.00 KiB
  …v2/collector (collector-pxebumdlwe.px-cloud.net)  — 14,196 ms, 0.00 KiB
  /b/s          (collector-pxebumdlwe.px-cloud.net)  — 15,190 ms, 0.00 KiB
  …v2/collector (collector-pxebumdlwe.px-cdn.net)    — 16,193 ms, 0.00 KiB
  /b/s          (collector-pxebumdlwe.px-cdn.net)    — 17,196 ms, 0.00 KiB
  …v2/collector (collector-pxebumdlwe.pxchk.net)     — 18,189 ms, 0.00 KiB
  /b/s          (collector-pxebumdlwe.pxchk.net)     — 19,192 ms, 0.00 KiB
```

`pxchk.net` / `px-cloud.net` / `px-cdn.net` are HUMAN Security (formerly PerimeterX). The
shape — the same two paths retried across three fallback domains, ~1,000 ms apart, every one
returning **0.00 KiB** — is a bot-detection sensor failing and cycling through its fallbacks.

**Where it is not:** not in the served HTML (checked), not in `package.json` (no `botid`), not
in `/_vercel/insights/script.js` or `/_vercel/speed-insights/script.js` (both fetched and
grepped), not anywhere in `src/`. Requests from here with a bot-shaped User-Agent came back
`X-Vercel-Cache: HIT` with no challenge and no `Set-Cookie`, so it couldn't be reproduced
from outside — which is consistent with it being applied only to traffic the edge scores as
suspicious, and PageSpeed Insights (Google datacenter IP, headless Chrome) is exactly that.

**The likely source is Vercel Bot Protection / BotID**, which is configured in the dashboard
rather than in the repo, and which uses HUMAN as its provider. See
[fix 1.3](#13-turn-off-vercel-bot-protection-or-confirm-it-isnt-on) for the check.

**What it costs:** the network doesn't reach idle for 19 seconds. That is one of the two
conditions for ending a Lighthouse trace, and it puts a floor under Speed Index independent
of anything the page itself renders.

---

## Root causes, ranked

### 1. `backdrop-filter` over a live canvas couples two 60 fps systems

**Owns:** most of the 35,670 ms charged to Motion · TBT · Speed Index

`LiquidGlassCard` declares `backdrop-filter: blur(12px)` (`LiquidGlassCard.tsx:104-106`), and
on the home page it sits directly over the WebGL canvas (`page.tsx:349-353`).

`backdrop-filter` means: snapshot everything painted behind this element, blur it, composite
it under the element's own background. The browser must redo that **whenever what's behind it
changes** — and what's behind it is a canvas repainting at 60 fps forever.

So the ocean's frame rate _is_ the card's paint rate. Two systems designed to be independent
multiply instead. And the card isn't cheap to repaint on top of that: on the same element,
Motion is also driving

- `background` — a three-stop gradient built from three `color-mix()` calls (`:82-88`)
- `borderColor` — another `color-mix()` (`:92`)
- `boxShadow` (`:95`)
- `width` and `height` — **layout** properties (`page.tsx:222-236`)
- an inner `radial-gradient` overlay (`:110-116`)

This is the missing link between "the canvas got 4× cheaper" and "the score didn't move".
Cutting particles made each _canvas_ frame cheaper. It did not reduce the _number_ of canvas
frames, and the number of canvas frames is what the card's blur is priced on.

The previous round found half of this — it's why `backdrop-filter` is `none` rather than
`blur(0px)` while the card is hidden. That fix was correct, and it stops there: once the card
is visible, the coupling is back at full strength for the rest of the visit.

### 2. The visibility gate cannot fire on this page

**Owns:** the entire steady state — 20 long tasks, TBT 8,760 ms, SI 12.1 s

`OceanScene` (`OceanParticles.tsx:383-390`) and `GlitchTextCycle`
(`GlitchTextCycle.tsx:44-45`) both gate on `useIsOnScreen`. The gate is well built. It can't
help here:

```tsx
// page.tsx:344 — the hero's sticky viewport
<div className='sticky top-10 flex h-dvh w-full flex-col items-center overflow-hidden p-4'>
  <div className='absolute inset-0 z-0 -translate-y-6'>
    <OceanScene />
  </div>
```

A `sticky` element inside a `200vh` track is pinned to the viewport for the whole track. It is
on screen from the first frame to the last. `IntersectionObserver` correctly reports `true`
the entire time, `frameloop` stays `'always'`, and the ocean renders forever.

`GlitchTextCycle` is in the same container, so it also cycles forever: every 3 s it runs 20
`setState` re-renders at 25 ms intervals, and during each 500 ms burst it mounts three
absolutely-positioned overlay spans plus three `glitch-bar` elements and turns on three
infinite CSS animations (`glitch-skew`, `animate-pulse`, `glitch-bar`) — all of it inside the
`backdrop-filter` element from #1.

**Visibility was the wrong signal.** The right one is _idleness_: nobody is watching an
animation on a page they haven't touched in ten seconds, and a headless browser never touches
it at all.

### 3. LCP is still gated on the scripted scroll

**Owns:** LCP 4.6 s · 16 of the 25 available points

```
Time to first byte        0 ms
Element render delay  2,890 ms
"I genuinely care about building robust, maintainable systems that never surpris…"  <p>
```

The delay halved (5,410 → 2,890 ms) because the auto-scroll now starts at 500 ms instead of
2,000. The gate itself is untouched (`page.tsx:219`):

```tsx
const descriptionOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
```

Confirmed in the deployed HTML — the bio block ships as `style="opacity:0"`, and it is the
only `opacity:0` in the document. An element at `opacity: 0` is not an LCP candidate, so LCP
can't fire until the auto-scroll drags `scrollYProgress` past 0.3, which takes 500 ms plus
most of a 3 s `easeInOut`.

**Why it got worse rather than better.** LCP always takes the _largest_ element, whenever it
paints. The `<h1>` paints immediately and is small. The bio paragraph paints late and is
large, so it wins and resets the clock. Shortening the delay moved the paint earlier, but the
`0.3 → 0.5` window is measured in _scroll progress_, not time, and an `easeInOut` is slowest
at its start — so the paragraph now arrives during a slightly different part of the ease. The
0.3 s regression is noise around an unchanged mechanism.

**There's a second trap here.** Even with the paragraph painted early, the card's `width` and
`height` keep animating, so the paragraph's box keeps _growing_. A text element that
re-lays-out larger produces a new, larger LCP candidate and pushes the metric back out. The
fix has to get the paragraph to its final **size** early, not just its final opacity.

### 4. The bot-detection cascade holds the network open for 19 s

Covered in [Read the new numbers §3](#3-there-is-a-19-second-third-party-request-chain-that-is-not-in-your-code).
Not a code problem — a project-settings problem. It's listed here because it's the only thing
in the report bigger than the render loop.

### 5. Render-blocking CSS · `src/app/globals.css`

**Owns:** "Render-blocking requests — 590 ms" · FCP

```
css/49d1ac0849de72c7.css   19.3 KiB transfer (119 KB raw)   600 ms   ← this one
css/b496025c9cd768cc.css    1.3 KiB transfer  (3.7 KB raw)  150 ms
```

Grew from 17.9 → 19.3 KiB as `/experience` landed, and it will keep growing: it's the single
Tailwind output every route shares. FCP is still 0.9 s so this isn't urgent, but it's 600 ms
sitting in front of every metric downstream of it, and the trend is the wrong way.

### 6. The polyfill block, and why `browserslist` couldn't remove it

**Owns:** "Legacy JavaScript — 12 KiB"

`browserslist` was added to `package.json` and the finding didn't move — same chunk id
(`4334`), same 11.6 KiB, same seven features, both runs. Fetching the chunk explains why. At
the flagged offset sits webpack module `54353`:

```js
54353:()=>{"trimStart" in String.prototype||(String.prototype.trimStart=…),
  Array.prototype.flat||(…), Object.fromEntries||(…), Array.prototype.at||(…),
  Object.hasOwn||(…)}
```

This is Next.js's own polyfill module, shipped **precompiled from `next/dist`** inside the
regular app-router runtime chunk. (`polyfills-42372ed130431b0a.js`, the `noModule` bundle, is
a _separate_ 112 KB file — modern browsers skip that one correctly.) `browserslist` governs
how _your_ source is transpiled; it doesn't reach inside a prebuilt dependency.

There's no supported switch for this on Next 15.4. **Treat it as fixed cost and stop looking
at it** — 11.6 KiB of transfer and effectively zero execution, since every feature check
short-circuits on the first `||`.

### 7. Forced reflow — 62 ms, unattributed

New, small, worth one look while you're already in `page.tsx`. `getScrollForProgress`
(`page.tsx:144-158`) reads `getBoundingClientRect()`, `window.scrollY`, `window.innerHeight`
and `document.documentElement.scrollHeight` together, and `useMediaQuery` reads
`matchMedia().matches` during an effect flush. Reading geometry after a style invalidation
forces a synchronous layout. Not worth restructuring for on its own — cache the track's
geometry once per resize if you're in there anyway.

---

## Fix plan

Each item is annotated with what the scoring curve says it's worth. The arithmetic is
[at the top](#read-this-first-the-score-didnt-drop-it-didnt-move) if you want to check it.

### Tier 1 — the score is here

#### 1.1 Ungate the LCP paragraph · `page.tsx` — **worth ~+16 points**

The largest single scored win, and the most contained change in this document. Two parts, and
both are needed (see [#3](#3-lcp-is-still-gated-on-the-scripted-scroll)):

**a) Decouple the bio's reveal from scroll.** Fade it in on mount over ~400 ms instead of on
`scrollYProgress`. The card still expands on scroll; the text just stops being hostage to it.

```tsx
// replace: const descriptionOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4, delay: 0.1 }}
  className='text-foreground/80 text-lg leading-relaxed'
>
```

**b) Stop the paragraph's box from growing.** Give the card's content container a fixed width
equal to its final one, so the text lays out once at its final size and the card grows
_around_ it. This is the "general version" the previous round explicitly chose not to do — it
is now load-bearing, because a growing text box re-triggers LCP.

It also removes a real per-frame cost: text layout is the expensive part of a re-wrap, and
right now the bio re-wraps on every frame of a 3 s animation.

The visible trade-off is the one the previous round flagged: on desktop the bio changes from
re-wrapping as the card grows to being revealed by the card's existing `overflow-hidden`.
That's a design call — but it's the same reveal mobile already gets.

Cheaper fallback, if you'd rather not touch the layout: keep the scroll gate but shorten the
intro to `AUTO_SCROLL_START_DELAY_MS = 0` and `AUTO_SCROLL_DURATION_S = 1.2`. That should land
LCP near 1.5-2.0 s for maybe +10 points, at the cost of a much brisker intro. It leaves the
growing-box trap in place, so measure it rather than assuming.

#### 1.2 Make the page go idle · `OceanParticles.tsx`, `GlitchTextCycle.tsx` — **worth up to +40 points**

Replace the visibility gate with an **idle gate**, keeping the visibility one for the other
routes. After N seconds with no `scroll`, `pointermove`, `pointerdown` or `keydown`, stop. Any
of those resumes it.

```ts
// screenUtils.ts — sits alongside useIsOnScreen
export function useIsUserActive(idleMs = 8000) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poke = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), idleMs);
    };
    const events = ['scroll', 'pointermove', 'pointerdown', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    poke();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, poke));
    };
  }, [idleMs]);
  return active;
}
```

Then in `OceanScene`, `AND` it with what's already there:

```tsx
const frameloop = !onScreen
  ? 'never'
  : prefersReducedMotion
    ? 'demand'
    : !userActive
      ? 'never' // ← new
      : 'always';
```

The auto-scroll fires `scroll` events, so the intro keeps the ocean alive on its own for the
first ~3.5 s and the arrival still looks right.

Do the same to `GlitchTextCycle`'s interval — gate on `onScreen && userActive`. Its existing
mid-scramble cleanup already settles the text back onto a real word, so pausing it is safe.

**Why this is the one that matters.** Lighthouse never interacts with the page. At `idleMs`
the loops stop, the main thread goes quiet, the trace terminates, and TBT and Speed Index both
collapse — those two are 40 of the 100 points, and you currently score 0 of them. A real
visitor reading the page is moving a pointer or scrolling; one who genuinely isn't gets a
still ocean that restarts the instant they touch anything.

#### 1.3 Turn off Vercel Bot Protection (or confirm it isn't on) — **worth up to +10 points**

Dashboard → the project → **Firewall** → **Bot Protection / BotID**. If it's enabled, turn it
off and re-run PSI. There's nothing on a portfolio site to protect, and it's currently holding
the network open for 19 seconds on the run you're being graded on.

If it's already off, the sensor is coming from somewhere else, and the way to find it is a PSI
run with the trace saved: open the JSON, find the initiator of the first
`collector-pxebumdlwe` request, and it will name the script that started it.

Do this **before** the other Tier 1 work, not after — it's a settings toggle, it's free, and it
changes the baseline you're measuring the rest against.

### Tier 2 — real wins, more work

#### 2.1 Break the `backdrop-filter` ↔ canvas coupling · `LiquidGlassCard.tsx`

Tier 1.2 stops the canvas when nobody's looking, which fixes the _measured_ cost. This fixes
the _actual_ cost, for real visitors who are looking. Options, cheapest first:

- **Drop the live blur on the home page only.** Add an `intensity='none'` (or `frosted={false}`)
  path that renders a static translucent background instead of `backdrop-filter`. Over a
  moving particle field the blur is doing very little visual work anyway — what's behind it is
  already diffuse.
- **Freeze the blur.** Let `backdrop-filter` settle to one value and stop it animating, so at
  least the radius isn't changing while the backdrop is.
- **Keep it, but stop the canvas under it** — which is what 1.2 does, and is why 2.1 is Tier 2
  rather than Tier 1.

#### 2.2 Cap the canvas pixel ratio · `OceanParticles.tsx`

`<Canvas>` (`:400`) sets no `dpr`, so R3F renders at the device ratio (clamped to 2×). On the
emulated Moto G Power that's 1.75 — roughly 1.15 M device pixels of additively-blended,
`discard`-ing fragments per frame. `dpr={1}` on mobile is close to invisible on a soft glowing
point field and cuts fill rate roughly threefold.

One gotcha: `uPixelRatio` currently reads `window.devicePixelRatio` directly (`:326-327`) and
feeds `gl_PointSize`. If you cap the canvas ratio, read the canvas's actual one
(`gl.getPixelRatio()` via `useThree`) or the points shrink with it.

#### 2.3 Stop animating `width` and `height` · `page.tsx:222-236`

Layout properties, animated per frame, on the element that has the blur on it. If 1.1(b) fixes
the content box, this becomes a straightforward swap to a fixed box with `transform: scale()`
on a wrapper the text doesn't live in — or to animating `max-height` / `clip-path`, both of
which composite instead of laying out.

CLS is already 25/25, so this buys no points directly. It's on the list because it's per-frame
layout work in the hottest part of the page.

### Tier 3 — cheap, do them while you're in there

- **Cache the scroll track's geometry** in `getScrollForProgress` (`page.tsx:144-158`),
  recomputing on resize, to clear the 62 ms forced reflow.
- **Recompress `me-and-rocky.jpg` a little harder** — 7 KiB of the served 20.7 KiB, per
  Lighthouse. Marginal; the right-sizing already did the heavy lifting.
- **Leave the polyfill finding alone.** See
  [#6](#6-the-polyfill-block-and-why-browserslist-couldnt-remove-it) — it can't be fixed from
  userland, and it costs ~nothing to execute.
- **Watch the CSS bundle.** 19.3 KiB and climbing with each new route. Not worth acting on at
  0.9 s FCP; worth a note in the next audit if it passes ~25 KiB.

### Expected outcome

| After                      | LCP           | TBT              | SI             | Score   |
| -------------------------- | ------------- | ---------------- | -------------- | ------- |
| today                      | 4.6 s → 9 pts | 8,760 ms → 0 pts | 12.1 s → 0 pts | **44**  |
| + 1.3 (bot protection off) | 4.6 s → 9     | ~8,000 ms → 0    | ~9 s → ~2      | **~46** |
| + 1.1 (ungate LCP)         | ~1.5 s → 25   | unchanged        | unchanged      | **~62** |
| + 1.2 (idle gate)          | ~1.5 s → 25   | <1,500 ms → ~22  | ~5 s → ~6      | **~88** |
| + Tier 2                   |               |                  |                | **90+** |

FCP (10) and CLS (25) are already full marks and are assumed to hold. The TBT and SI figures
in the last two rows are the least certain numbers in this document — they depend on the trace
actually terminating, which is the whole point of 1.2 but can only be confirmed by running it.

### Order of work

1. **1.3** — a settings toggle. Re-run PSI to get a clean baseline.
2. **1.1** — contained, biggest scored win, doesn't interact with the others.
3. **1.2** — the structural one. Re-run PSI after it and before starting Tier 2: if the trace
   terminates, the remaining numbers change enough that Tier 2's priority may change with them.

---

## History: the Aug 26 round

Everything below documents the previous audit and the work that came out of it. The _findings_
are superseded by the sections above. The _implementation notes_ are still current and worth
keeping, because several of them explain why a thing is written the way it is.

### The Aug 26 diagnosis, in short

Performance 46 · FCP 0.9 s · LCP 4.3 s · TBT 22,800 ms · CLS 0.019 · SI 15.4 s. Main-thread
work 41.1 s against 707 ms of script evaluation, long tasks still firing at second 34, and the
LCP element gated behind a `setTimeout`. The eight root causes were: the ocean canvas rendering
33,153 particles forever; the LCP paragraph invisible until a timer fired; the scroll animation
driving layout-and-paint properties per frame; three.js in the initial bundle; an oversized,
over-quality, lazily-loaded hero photo; render-blocking CSS; legacy polyfills; and an unused
preconnect.

Six of those eight were fixed or substantially improved. The two that weren't —
[the LCP gate](#3-lcp-is-still-gated-on-the-scripted-scroll) and
[the never-idle loop](#2-the-visibility-gate-cannot-fire-on-this-page) — are the two that carry
the score, which is why the number didn't move.

### Why only the home page

Still true, and still the reason no other route needs this treatment.

|                                                      | `/`                                   | `/about-me`, `/projects`, `/experience`, `/resume` |
| ---------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| WebGL particles                                      | **33,153** desktop / 8,385 mobile     | 1,550 (`WaveSpray`)                                |
| Canvas area                                          | full viewport (`inset-0`, `h-dvh`)    | banner strip                                       |
| Blending                                             | additive + `discard` (heavy overdraw) | same shader family, far less area                  |
| `OrbitControls` + raycast hitbox                     | yes                                   | no                                                 |
| Scroll-driven `width`/`height` animation             | yes                                   | no                                                 |
| Animated `backdrop-filter` over the canvas           | yes                                   | no                                                 |
| Scripted 3 s auto-scroll                             | yes                                   | no                                                 |
| LCP element gated behind scroll progress             | yes                                   | no                                                 |
| Sticky container, so the visibility gate never fires | **yes**                               | no                                                 |

### Changes applied in that round

#### The render loop now stops · `OceanParticles.tsx`, `screenUtils.ts`

> **Superseded.** The mechanism is right and still in place, but on this page the gate never
> fires — the canvas is inside a `sticky h-dvh` container and is never off screen. See
> [root cause #2](#2-the-visibility-gate-cannot-fire-on-this-page).

New `useIsOnScreen(ref)` hook (`src/lib/screenUtils.ts`) combining an `IntersectionObserver`
(128px `rootMargin`, so it resumes just before scrolling back in) with `visibilitychange`.
`OceanScene` feeds it into R3F's `frameloop`:

| State                            | `frameloop` | Effect                |
| -------------------------------- | ----------- | --------------------- |
| Scrolled past / backgrounded tab | `never`     | No frames at all      |
| `prefers-reduced-motion`         | `demand`    | One static frame      |
| Visible, motion welcome          | `always`    | The ocean as designed |

**This had to be `frameloop`, not an early return from `useFrame`.** R3F calls
`gl.render()` every tick regardless of what the frame subscriptions do, and drawing the
points _is_ the cost — skipping the uniform updates would have saved nothing.

Two consequences that needed handling so behaviour stays identical:

- Under `demand` there is only one frame, so every lerp would freeze 5% of the way to
  its target. `WaveParticles` takes a `snap` prop that collapses each easing factor to 1.
- Theme targets live in refs, so React never re-renders and R3F never learns anything
  changed — a theme switch under `demand` would keep the old colours. The theme effect
  now ends with `invalidate()` (a no-op under `always`).

#### Mobile particle density · `OceanParticles.tsx`

`DESKTOP_SEGMENTS = [256, 128]` (unchanged, 33,153 points) / `MOBILE_SEGMENTS = [128, 64]`
(8,385 points). Resolved **once** at mount via `window.matchMedia`, not `useMediaQuery` —
changing it later would rebuild the whole vertex buffer, and the component is client-only
now so there's no hydration mismatch to start `false` for.

#### LCP is no longer gated on a timer · `page.tsx`

> **Half true.** The 2 s timer went, but the paragraph is still gated on `scrollYProgress`, and
> LCP is still the metric costing the most points. See
> [root cause #3](#3-lcp-is-still-gated-on-the-scripted-scroll).

- Delay `2000ms` → **`500ms`** (`AUTO_SCROLL_START_DELAY_MS`).
- `prefers-reduced-motion` skips the animated scroll entirely and lands on the same end
  state instantly — same result, none of the travel.
- **Auto-scroll target rewritten.** It was `window.innerHeight * 0.8`, which fell short on
  phones: `vh` units resolve against the _large_ viewport while `innerHeight` is the
  smaller visible one, so 0.8 viewport-heights covered less of a 200vh track than
  intended and left the photo part-transparent. `getAutoScrollTarget()` now inverts the
  `useScroll` offset against the track's real `getBoundingClientRect()` and targets
  `AUTO_SCROLL_TARGET_PROGRESS = 0.85` — expressed in the same 0-1 space the animations
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

#### The card's resting size flashed on desktop · `page.tsx`

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

#### Sub-pixel shake during the auto-scroll · `page.tsx`

Text inside the hero jittered up and down by a fraction of a pixel for the whole run of
the scroll animation. `animate` emits floats and `onUpdate` passed them straight to
`window.scrollTo`, and the hero lives in a `position: sticky` container — the browser
recomputes that element's offset from the scroll position every frame, so a fractional
`scrollY` makes the rounding land differently frame to frame and everything inside the
card moves with it.

`Math.round(value)` in `onUpdate`. At roughly 4px of travel per frame, rounding costs
nothing in smoothness.

#### The hero heading shook on mobile · `page.tsx`

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

#### CLOSED (environmental): a vertical bob in the hero text

Not a code bug. Recorded in full because it cost a day and the next person to see it
should not repeat the hunt.

**Symptom.** The hero text bobs vertically by a small amount while scrolling through the
hero, on both the auto-scroll and manual scroll. Steady-rate rather than scaling with
scroll speed. Seen in an iPhone emulator.

**Resolution.** Bisected to nothing. `a39f89e` is the commit live in production. That
commit _does_ bob when built and served locally (`pnpm build && pnpm start`) and _does
not_ bob on the deployed site — same code, same browser, same machine. The variable is
the serving environment, not the source. Local-only sub-pixel jitter of a
`position: sticky` element under emulated device-pixel-ratio scaling is the likeliest
explanation and there is nothing to fix in the repo.

**If a real visitor ever reports it**, that changes the picture and the place to start is
the sticky container in `page.tsx` (`sticky top-10 … h-dvh`), not the card.

**Ruled out by direct test** (all of these were dead ends — kept as a record of what the
bob is _not_):

| Suspect                    | Test                                                                                        | Result                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Card size animation        | Removed `height`/`width` from the card's motion `style` (CSS classes hold the resting size) | Still bobs                                                             |
| Animated `backdrop-filter` | Commented out `backdropFilter` / `WebkitBackdropFilter` in `LiquidGlassCard`                | Still bobs                                                             |
| `glitch-skew` keyframes    | Read them — `skew()` only, no translate, and only during a glitch burst                     | Can't cause it                                                         |
| Glitch scramble reflow     | `whitespace-nowrap` on `GlitchTextCycle`'s root                                             | Not the cause; reverted (the multi-line wrap is wanted for the effect) |

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
prod-build-plus-old-code, two variables at once. Building the _live_ commit locally was
the check that ended it, and it should have been the first one, not the last.

#### Back navigation to `/` was broken · `page.tsx`

Pre-existing, found while working on the scroll behaviour and unrelated to any of it.
Navigating away from the home page and pressing Back changed the URL and re-rendered
nothing.

`page.tsx`'s mount effect called `window.history.replaceState(null, '', '/')` to strip a
stale `?clicks=N`. Next stores its router tree on the history entry, and its popstate
handler (`next/dist/client/components/app-router.js`) opens with:

```js
const onPopState = (event) => {
  if (!event.state) return; // ← silently does nothing
  if (!event.state.__NA) {
    window.location.reload();
    return;
  }
  startTransition(() => dispatchTraverseAction(/* ...tree */));
};
```

Nulling the state made the home entry unrecoverable. Next _does_ patch
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

#### Code splitting · `page.tsx`, `OceanParticles.tsx`

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

#### Image delivery · `page.tsx`

`sizes` was a blanket `170px` below 768px for a box that renders at ~120 CSS px — that
overstatement is what made phones fetch the `384w` candidate. Now matched per breakpoint,
minus the 16px the wrapper's `p-2` takes off:

```
(min-width: 1024px) 300px, (min-width: 768px) 244px,
(min-width: 450px) 222px, (min-width: 390px) 120px, 96px
```

Plus `quality={90}` → `75` and `priority` added (it's in the initial viewport, just
transparent until the scroll reveals it, so lazy-loading bought nothing).

#### Polyfills · `package.json`

> **Didn't work.** The finding is byte-for-byte identical in the Sep 4 run. The polyfills ship
> precompiled from `next/dist`, where `browserslist` can't reach them. See
> [root cause #6](#6-the-polyfill-block-and-why-browserslist-couldnt-remove-it).

```json
"browserslist": ["chrome >= 111", "edge >= 111", "firefox >= 128", "safari >= 16.4", "ios_saf >= 16.4"]
```

This is Tailwind v4's own baseline, so it isn't actually aggressive — the site already
uses `color-mix()` and `@property`, which means browsers below this line can't render it
correctly regardless.

#### `useMediaQuery` · `screenUtils.ts`

Dropped `matches` from the dependency array (it tore down and re-subscribed the listener
on every change) and seeded from the real value on mount.

#### `LiquidGlassCard` — what was _not_ done, and why

> **Revisit this one.** The reasoning held for CLS, which is still 25/25. What it missed is that
> `backdrop-filter` over a repainting canvas prices the card's paint at the canvas's frame rate,
> and that a growing text box re-triggers LCP. See
> [root cause #1](#1-backdrop-filter-over-a-live-canvas-couples-two-60-fps-systems) and
> [fix 1.1(b)](#11-ungate-the-lcp-paragraph--pagetsx--worth-16-points).

The original plan was to replace the `width`/`height` motion values with a fixed-size box
and `transform: scale()`. **Skipped deliberately**, for two reasons:

1. `scale()` scales the _contents_ — the heading, glitch text and bio would grow and
   shrink with the card. That is a visible change, not a refactor.
2. **CLS was already scoring 25/25.** The 0.019 buys nothing back; the width animation is
   a correctness nit, not a score problem.

What _was_ done is the part that actually costs: `backdrop-filter` is now `none` (not
`blur(0px)`) while the card is hidden, so it isn't a backdrop root over the live canvas
before it's needed, and the radius is rounded to whole pixels so each frame isn't a fresh
blur kernel. Both are imperceptible.

#### The second never-idle loop · `GlitchTextCycle.tsx`

> **Superseded.** Same gate, same problem: the hero text is on screen for the whole trace, so
> the cycle still runs forever. See [root cause #2](#2-the-visibility-gate-cannot-fire-on-this-page).

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

#### Still open, as of Aug 26

- **Render-blocking CSS** (600 ms, `1777b40ce2dc5a9b.css`). Untouched — FCP is already
  0.9 s and this is the lowest-leverage item in the report.
- ~~**Source image recompression**~~ — done. `me-and-rocky.jpg` 2.8 MB → 364 KB,
  `personal-photo.jpg` 2.5 MB → 323 KB. Commands kept below for the next photo.
- **Reduced motion for the glitch itself.** Deliberately left alone — unlike the ocean,
  the glitch _is_ the component's content rather than decoration around it, so freezing it
  on "Developer" is a product call, not a perf one.

#### Source image recompression (run locally)

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

## Appendix: what is _not_ wrong

Worth stating plainly, because these are the things people usually reach for first — and
because two of them have now been checked twice:

- **TTFB is 0 ms.** Hosting and server rendering are fine.
- **FCP is 0.9 s**, scoring a full 10/10. First paint is fast and has been both runs.
- **CLS is 0.012**, scoring a full 25/25. The five shifts Lighthouse lists are all
  `LiquidGlassCard` growing, they total 0.012 against a 0.1 threshold, and fixing them buys
  exactly zero points. [Tier 2.3](#23-stop-animating-width-and-height--pagetsx222-236) is on
  the list for per-frame layout cost, not for CLS.
- **The bundle is not the problem.** 226.8 KiB across the flagged chunks is unremarkable, the
  code splitting from the last round verifiably worked, and three.js is off the critical path.
  You have a _per-frame work_ problem, and it survived a 130 KiB reduction in initial JS.
- **Image delivery is basically done.** 77.8 KiB → 20.7 KiB, with 7 KiB of compression left.
- **The polyfill finding is not actionable.** See
  [#6](#6-the-polyfill-block-and-why-browserslist-couldnt-remove-it).
- **DOM size is 159 elements, depth 13.** Nowhere near a problem.
- **Accessibility 96 / Best Practices 100 / SEO 100 / Agentic Browsing 2/2.** Nothing to do.

### How each new claim in this document was verified

So the next run doesn't have to re-derive it:

| Claim                                      | How it was checked                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Report matches the live build              | CSS hashes `b496025c9cd768cc` / `49d1ac0849de72c7` and chunk hashes `3166-2e7ac125cc56f021` / `4334-2181f091c01875f3` in the report all appear in the served HTML     |
| `3166` is Motion                           | fetched the chunk: 35 × `MotionValue`, 12 × `motionValue`, 3 × `willChange`, no `@react-three`, no `WebGLRenderer`                                                    |
| `179` is R3F                               | fetched: `@react-three/fiber`, 11 × `frameloop`, `advance`, `invalidate`, plus React's scheduler                                                                      |
| `e8867c6f` / `7566a6ad` are three.js       | fetched: `BufferGeometry`, `ShaderMaterial`, `THREE`, `WebGLRenderer`                                                                                                 |
| Code splitting worked                      | those four chunk names are absent from the SSR'd HTML's `<script src>` list                                                                                           |
| LCP paragraph still ships hidden           | `opacity:0` appears exactly once in the served HTML, on the bio block                                                                                                 |
| Image fixes landed                         | `sizes` is the per-breakpoint string, `q=75`, no `loading="lazy"` on the tag                                                                                          |
| `browserslist` didn't remove the polyfills | module `54353` in chunk `4334` contains the feature-detection block verbatim; the separate `noModule` `polyfills-*.js` is a different 112 KB file                     |
| The px chain isn't first-party             | absent from the served HTML, from `package.json`, from `src/`, and from both `/_vercel/*/script.js` files; not reproducible from outside with a bot-shaped User-Agent |
