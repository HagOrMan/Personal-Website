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
Flask, Flutter, JTS Topology Suite, Java, JavaScript, Log4j2, Maven,
MongoDB, Next.js, NextAuth, Pygame, Python, React, Supabase, Tailwind CSS,
Three.js, TypeScript
```

The list is short on purpose — it only holds things I've actually built with,
so it will very often be missing what this repo uses. That's expected. When it
is, name the missing tool at the end of your answer and leave it out of
`tools`; I'll add it to `TOOLS` in
`src/types/projects/ProjectShowcase.ts`, which is what makes the object
compile. Never substitute the nearest match — a Django project is not a Flask
project, and C++ is not C.

Only list tools that are actually load-bearing. A repo with a single Dockerfile
nobody uses is not a Docker project. Aim for two to five.

**`description`** — one or two sentences, written for someone who's never
heard of the project. It gets clamped to two lines on the card, so keep it
under about 110 characters. Say what it does, not how it was built — `skills`
and `tools` already cover that.

**`year`** — when the work actually happened, in one of three forms:

| you type | card shows | use it when |
| --- | --- | --- |
| `2019` | 2019 | the work fits inside one year |
| `'2023-2026'` | 2023–2026 | it ran across several |
| `'2024-present'` | 2024–present | it's still going |

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

| tag | means |
| --- | --- |
| `no-ai` | Written start to finish without AI assistance. |
| `fullstack` | Has both a frontend and a backend I built. |
| `community` | Built for or with other people, rather than just for me. |
| `personal` | Built for myself, for fun or to solve my own problem. |
| `work` | Built professionally or for a client. |
| `at-scale` | Has real users, or handles real volume. |
| `hackathon-winner` | Won something at a hackathon. |

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
- **Add the poster.** Drop a 16:9 image at `public/projects/{slug}.jpg` and set
  `thumbnail: '/projects/{slug}.jpg'`. Without one the card renders a skeleton
  in the media slot, which is fine but dull.
- **Add the preview loop**, if there is one. Record at 1080p in OBS, trim in
  CapCut, then encode:

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

  Upload it to the R2 bucket as `projects/{slug}.mp4` — videos never live in
  this repo, same rule as the about-me series — then set
  `video: previewVideoSrc('{slug}')`.

- **Check the slug.** There must be a `src/app/projects/{slug}/page.tsx`. The
  build fails if there isn't, which is the intended behaviour.
