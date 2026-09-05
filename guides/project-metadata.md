# Generating project metadata from a repo

The projects page on my personal website is driven entirely by
`src/constant/projects.ts`. Every card — the filters, the tools dropdown, the
year, the links — reads from one object per project.

This file is the prompt for producing that object. Open the project's **own**
repo in Claude Code and paste everything under the line into the prompt. Then
paste the result back into `src/constant/projects.ts` on the website.

There's a checklist at the bottom for the parts a repo can't tell you.

---

Read this repository and produce the metadata object described below. Base
every field on what's actually in the code — README, source files, manifest
files (`package.json`, `requirements.txt`, `pom.xml`, `*.csproj`, `go.mod`),
and git history. Where the repo genuinely doesn't say, leave a
`// TODO: confirm` comment on that line rather than inventing something.

Output one TypeScript object literal and nothing else. This is the shape:

```ts
{
  slug: string;        // kebab-case, matches the detail page's URL
  name: string;        // display name
  skills: string;      // prose, for humans
  tools: string[];     // exact strings from the vocabulary below
  description: string; // one or two sentences
  year: number | `${number}-${number}` | `${number}-present`;
  tags: string[];      // from the tag list below
  featured: boolean;
  links: { kind: 'github' | 'demo' | 'article' | 'download'; href: string }[];
}
```

### Field rules

**`slug`** — kebab-case version of the project name. Flag it if the repo name
disagrees with the display name; the website's route directory wins.

**`skills`** — prose for a human reader, rendered in italics next to the name
on the card. A short comma list is fine (`"Python, Pygame"`), and so is naming
a skill that isn't a tool (`"Java, generator patterns"`, `"React, leading a
team of five"`). It never drives a filter, so it's allowed to be interesting.

**`tools`** — the filter key, exact-matched, so it must come from this
vocabulary verbatim:

```
Angular, Docker, Express, Flask, Flutter, GitHub Actions, JTS Topology Suite,
Java, JavaScript, LaTeX, Log4j2, Mantine, Maven, MongoDB, Next.js, NextAuth,
Node.js, Playwright, PostgreSQL, Pygame, Python, React, Recharts, SQL,
Selenium, Supabase, Tailwind CSS, TanStack Query, Three.js, TypeScript,
Zustand
```

Reach for `PostgreSQL` over `SQL` for anything running on Postgres, Supabase
included — the specific chip is worth more than the generic one.

The list is short on purpose — it's roughly the set of things I've actually
built with, so it will often be missing what this repo uses. That's expected.
When it is, name the missing tool at the end of your answer and leave it out of
`tools`; I'll add it to `TOOLS` in
`src/types/projects/ProjectShowcase.ts`, which is what makes the object
compile. Never substitute the nearest match — a Django project is not a Flask
project, and C++ is not C.

Only list tools that are actually load-bearing. A repo with a single Dockerfile
nobody uses is not a Docker project. Beyond that, be generous — `tools` never
renders on a card, it only feeds the filter, so eight entries read no
differently than three. Name everything that genuinely shaped the build.

**`description`** — one or two sentences, written for someone who's never
heard of the project. It gets clamped to two lines on the card, so keep it
under about 110 characters. Say what it does, not how it was built — `skills`
and `tools` already cover that.

**`year`** — when the work actually happened, in one of three forms:

| you type         | card shows   | use it when                   |
| ---------------- | ------------ | ----------------------------- |
| `2019`           | 2019         | the work fits inside one year |
| `'2023-2026'`    | 2023–2026    | it ran across several         |
| `'2024-present'` | 2024–present | it's still going              |

Get the bounds from git:

```bash
git log --reverse --format=%ad --date=format:%Y | head -1   # first commit
git log -1 --format=%ad --date=format:%Y                    # last commit
```

If those two years match, use the plain number. If they differ, check whether
the gap is real work or a stray commit years later fixing a typo in the README
(`git log --format=%ad --date=format:%Y | sort | uniq -c` shows the shape) —
use a range only when the project was genuinely worked on across those years,
and say which you saw.

Never write `'-present'` on your own judgement. Propose it if the last commit
is recent and the repo looks live, but flag it: only I know whether a project
is still going or just recently abandoned.

**`tags`** — zero or more of:

| tag                | means                                                    |
| ------------------ | -------------------------------------------------------- |
| `no-ai`            | Written start to finish without AI assistance.           |
| `fullstack`        | Has both a frontend and a backend I built.               |
| `community`        | Built for or with other people, rather than just for me. |
| `personal`         | Built for myself, for fun or to solve my own problem.    |
| `work`             | Built professionally or for a client.                    |
| `at-scale`         | Has real users, or handles real volume.                  |
| `hackathon-winner` | Won something at a hackathon.                            |

`no-ai` is a claim about how it was written — check the git history for a
plausible date and commit rhythm rather than assuming. If you can't tell,
leave it off and say so; I'll add it myself.

**`featured`** — leave it `false`. That's my call, not the repo's.

**`links`** — the GitHub remote (`git remote get-url origin`, rewritten to its
https form), plus any deployed URL, write-up, or release download the README
points at. Skip anything that 404s or that points at a dead host. Empty array
if there's nothing.

### Also tell me, outside the object

1. Anything you had to guess, and what you based the guess on.
2. Any tool the vocabulary is missing.
3. One sentence on what would make the best 5-second preview loop for this
   project — the single action that shows what it does. I record these in OBS
   and they need to start and end in a similar visual state so the loop seam
   isn't jarring.

---

## The parts the repo can't tell you

After pasting the object into `src/constant/projects.ts`:

- **Set `featured`.** Three to six featured projects is the target; that's what
  the page opens on.
- **Add the media.** Posters and loops are both wired up by one script, and
  `thumbnail` / `video` are never written by hand — see the section below.
  Without media a card renders a skeleton in the slot, which is fine but dull.
- **Encode the preview loop** before running that script. Record at 1080p in
  OBS, trim in CapCut, then:

  ```bash
  ffmpeg -i input.mp4 \
    -an \
    -vf "scale=800:-2,fps=30" \
    -c:v libx264 -crf 28 -preset slow \
    -pix_fmt yuv420p -movflags +faststart \
    output.mp4
  ```

  `-an` strips the audio track (these never have sound), `+faststart` lets
  playback begin before the file finishes downloading. Target under 800KB, hard
  ceiling 1.5MB — push `-crf` toward 30 if it's over.

  Cards letterbox with `object-contain`, so a loop that isn't 16:9 is fine —
  it gets bars rather than a crop. Frame it however it reads best.

- **Check the slug.** There must be a `src/app/projects/{slug}/page.tsx`. The
  build fails if there isn't, which is the intended behaviour.

# Video + Cover Workflow

1. Cut and encode a video

Replace NAME, START, and DURATION. -t is a duration, not an end time — subtract: for 7s→14s, use -ss 7 -t 7.

```bat
ffmpeg -ss START -i NAME.mp4 -t DURATION -c:v libx264 -crf 26 -preset slow -profile:v high -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an -movflags +faststart NAME.mp4
```

If a cut lands slightly off, move -ss to after -i for that file — frame-exact, slower.

Chain several with &&:

```bat
ffmpeg ... video-a.mp4 && ffmpeg ... video-b.mp4
```

2. Cover image

Single file — matches the video name, .webp extension:

```bat
ffmpeg -y -i NAME.mp4 -frames:v 1 -c:v libwebp -quality 80 -compression_level 6 -preset picture NAME.webp
```

Frame too early? Add -ss SECONDS before -i (relative to the cut, decimals OK).

Batch — run once all videos are final. Save as make-covers.bat in the video folder:

```bat
@echo off
for %%f in (*.mp4) do (
    echo Generating cover for %%~nf
    ffmpeg -y -loglevel error -i "%%f" -frames:v 1 -c:v libwebp -quality 80 -compression_level 6 -preset picture "%%~nf.webp"
)
echo Done.
pause
```

OR run this in command prompt:

```cmd
for %f in (*.mp4) do @(echo Generating cover for %~nf & ffmpeg -y -loglevel error -i "%f" -frames:v 1 -c:v libwebp -quality 80 -compression_level 6 -preset picture "%~nf.webp") & echo Done.
```

Regenerates every cover from every mp4 in the folder. Re-run it any time you re-cut something.

## Wiring the media up

Put the poster at `public/projects/{slug}.webp`, upload the loop to the R2
bucket as `projects/{slug}.mp4`, then:

```bash
bash scripts/prepare-project-assets.sh
```

That rewrites `PROJECT_MEDIA` in `src/constant/projectAssets.ts` from the
posters on disk, and refuses to write if one doesn't match a route directory.
Never set `thumbnail` or `video` on a project object by hand — they're attached
from that list.
