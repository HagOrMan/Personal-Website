# Style guide

The rules this site's visual design actually follows, and the traps that have
already bitten. Most of these are decisions with a reason, not preferences —
where a rule exists to stop a specific bug, the bug is named.

If you're adding a component, the two sections you can't skip are
[Radius means role](#radius-means-role) and [Actions](#actions).

---

## Typeface

Geist everywhere, set once on `body` in `globals.css`. Don't set a font on a
page or a component.

The one exception is `/blog`, which uses `--font-blog` (Arial) applied by
`app/blog/layout.tsx`. The blog is deliberately its own thing — Geist is a UI
grotesque and reads as software, which is wrong for a page that's mostly prose.

> **Trap.** Changing `--font-blog` changes the blog's *column width* as well as
> its type. `.blog-prose` and the blog index are capped in `ch` — the width of
> the "0" glyph — so a narrower face silently narrows the measure.

---

## Colour

### Tokens come in two shapes, and both need wrapping

| Token family | Holds | Use as |
| --- | --- | --- |
| `--background`, `--foreground`, `--card`, `--muted`, `--border`, … | bare HSL channels (`210 30% 12%`) | `hsl(var(--background))` |
| `--tw-color-lush-500`, `--tw-color-breeze-400`, … | bare RGB triplets (`0 209 176`) | `rgb(var(--tw-color-lush-500))` |

They're stored unwrapped so alpha can compose — `hsl(var(--background) / 0.6)`.

> **Trap.** Used raw, they aren't colours, the declaration is invalid, and the
> browser silently drops it. `body { background: var(--background) }` shipped
> for a long time doing nothing at all.

Tailwind classes (`bg-background`, `text-lush-600`) already wrap for you. Only
raw CSS and inline styles need care.

### The three palettes

`lush` (turquoise, the primary — it's what `--primary` resolves to), `breeze`
(blue), `nebula` (purple). Light and dark variants of every step live in
`:root` and `html.dark`.

### Accents rotate; don't hand-pick

`getAccent(index)` in `lib/projects/accents.ts` — a flat lush → breeze → nebula
rotation. `ribbonAccent` is an alias of it, so the homepage ribbon and the
/projects grid can't drift apart.

Pass the item's position among the **visible** items, so the pattern survives
filtering.

`ACCENT_VARS[key]` gives three values, and they are not interchangeable:

- `border` and `glow` are tuned as a pair, because they're only ever seen
  against each other on a card.
- `text` is the same accent at a weight that holds up as type on the page
  background. **Anything rendering an accent as words wants `text`.**

---

## Radius means role

Not taste. The test is what the thing *is*, and it's usually obvious:

| Radius | Role | Examples |
| --- | --- | --- |
| `rounded-full` | **A label.** Content, not a control — mostly non-interactive spans. | `Chip`: stack chips, blog tags, project tag filters |
| `rounded-lg` (8px, `--radius`) | **An action.** Every button and link-button. | `actionVariants` — ribbon rows, card footers, LinkedIn post link, about-me |
| `rounded-md` | **A dense control inside a group.** Tighter because it's nested one box deeper. | segmented tabs, dropdown items, form fields |
| `rounded-xl` | **A surface that holds content.** | `ProjectSpotlightCard`, `TimelineEntry`, `ReferenceCard` |
| `rounded-3xl` | **The glass object, and only that.** Its whole job is to not look like a card. | `LiquidGlassCard` |

**Round is a thing; square-ish is a doing.** The practical payoff: actions sit
in rows and pills don't. Round caps pull away from their neighbours, so a row
of pills reads as scattered at any gap that isn't cramped, while straight
vertical sides line up and a footer of three actions reads as one group.

Outside the ladder on purpose: the gallery's 3px tiles (a contact sheet wants
no frames) and circular icon buttons — a circle around a single glyph is a
shape, not a corner radius.

---

## Actions

Everything clickable that isn't a chip goes through
`actionVariants` (`src/components/ui/actionVariants.ts`). One height (h-9), one
type size (text-sm), one radius.

**Variants**

- `accent` — the one filled action in a group. Reads `--row-accent`.
- `outline` — everything beside it. Neutral until pointed at.
- `ghost` — no border, no fill, for the action that ends a group ("Read more").
- `linkedin` — the LinkedIn post link, in the rail's breeze.

**Sizes** — `default` (labelled) and `icon` (square, one glyph, no label).

### `--row-accent`

The *surface* sets it; the button reads it. `RibbonRow` sets it on the text
half, `ProjectSpotlightCard` on the article, the about-me connect row on the
row. That's what lets the primary action take the colour of the glow behind
the media without threading a prop through everything in between.

> **Trap.** An inline `backgroundColor` outranks every class, so the accent
> variant uses arbitrary values (`bg-[color-mix(...)]`) rather than a style
> object — otherwise no `hover:bg-*` could ever replace it.

### Which links get labels

Set in `LINK_META` (`components/projects/linkMeta.tsx`), not per call site, so
the /projects cards and the homepage ribbon can't disagree. `iconOnly` marks
the tertiary rung. More than one icon-only link in a row and the row stops
being readable.

> **Trap.** Don't add `cursor-pointer` to an `<a target="_blank">`. `globals.css`
> gives those the new-tab cursor from the base layer, and a cursor utility
> outranks a base-layer rule — you'd silently remove the one affordance saying
> the link leaves the site. Non-link buttons should pass it themselves.

### cva doesn't merge

`actionVariants` wraps its cva in `cn()`, and that's load-bearing. cva only
concatenates, so a variant overriding part of a size would be settled by
*stylesheet* order rather than the order written — and Tailwind emits `px-1`
before `px-4`, so the variant loses. Any new cva that lets variants override
base or size classes needs the same wrapping.

---

## Layout

- `.page-shell` — the wrapper for every `<main>`: responsive padding, top
  padding to clear the nav, `min-h-screen`.
- `.page-padding-x` — horizontal padding only, for sub-sections.
- `.page-measure` — the content measure, 80rem.

> **Trap.** `.page-measure` must sit on the **same element** as the horizontal
> padding. Nested inside the padding instead, the content comes out 8rem wider
> than everywhere else — a near-miss nobody spots.

Deliberately outside the measure:

- `/blog` keeps its 72ch **reading** measure — a different job from a layout
  measure.
- `/about-me` and `/gallery` are uncapped: the first needs room for its text
  column and sticky video side by side, the second is a photo wall where more
  width is just more photos per row.

---

## Type details

**Uppercase tracking** — caps close up into a block without letter-spacing.
Two tokens, and the test is whether the label is read or scanned:

- `tracking-eyebrow` (0.16em) — display. Sits over a heading on open page and
  is part of what the reader is reading.
- `tracking-label` (0.08em) — UI. Names a control or a panel ("Variant", "On
  this page"). Furniture, usually in a tight box.

**Lists** — put `role='list'` on any `<ul>` you've stripped markers from.
Tailwind's preflight removes `list-style`, which makes Safari/VoiceOver drop
the list semantics entirely.

---

## Icons

Pick by whether the colour has to move:

- **Inline glyph in `currentColor`** (`GitHubGlyph`, `LinkedInGlyph`) inside a
  link or button, where the mark must follow the text through hover and focus.
- **Raster** (`GitHubIcon`, `LinkedInIcon`) for a standalone brand credit at a
  fixed colour — the footer, the hero.

> **Trap.** A theme-dependent icon must choose its file in **CSS**, off the
> `.dark` class on `<html>` — render both and hide one. Don't reach for
> `useResolvedTheme()`: it reports `'light'` on the server *and the first
> client render* (that's why the context exposes `isThemeReady`), so a
> dark-mode visitor gets the black mark on a near-black page until it settles.

> **Trap.** A hand-rolled `<svg>` needs `width` and `height` attributes. With a
> viewBox and no dimensions it resolves to `100%`/`100%`, not to the viewBox —
> which is zero inside an auto-height flex button. Every lucide icon ships
> them for this reason. A CSS size still overrides.

---

## Motion

Motion (`motion/react`) for UI, Three.js for backgrounds.

> **Trap.** Never branch a motion `initial` on the reduced-motion setting. The
> server can't read it, so a hidden state that depended on it hydrates as a
> style mismatch. Branch the *transition* instead and let the reduced path run
> the same variants with a zero-length duration — see `ribbon.ts` and
> `TimelineEntry`.

`PopCard` is the reusable shake-and-pop primitive. Decorative motion should be
`motion-safe:` only — a transform that snaps rather than eases is worse than no
transform.

---

## What's deliberately different

Cohesion is the default, but these are distinct on purpose. Don't "fix" them:

- **`/blog`** — its own typeface and reading measure. Other pages may borrow
  from it; it doesn't borrow back.
- **`/gallery`** — a justified contact sheet: 3px tiles, 4px gaps, raw
  `<picture>` with R2 srcsets rather than `next/image` (the files are already
  optimised at build time; routing them through Vercel's optimiser is billed
  transforms for nothing).
- **`/projects`** — the variant picker and the shake-and-pop grid swap are the
  page's one gesture.
- **`/experience`** — the timeline rail and the tilted photo plate.
- **The hero** — `LiquidGlassCard` and its glass-tinted pills. The glass earns
  them there; they don't travel.

The site's distinctness lives in the accent rotation, the aurora behind each
ribbon row, the shimmer on section headings, the grid swap, the photo plate and
the photo wall. Ordinary furniture — buttons, chips, radii — should be quiet so
that work reads.
