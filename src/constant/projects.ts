import { PROJECT_MEDIA } from '@/constant/projectAssets';
import { compareProjectYears } from '@/lib/projects/year';
import { TProjectShowcase } from '@/types/projects/ProjectShowcase';

/**
 * Preview loops live in Cloudflare R2 next to the about-me videos, never in
 * this repo — same rule as constant/videos.ts.
 */
const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL ?? '';

export function previewVideoSrc(slug: string): string {
  return `${R2_BASE_URL}/projects/${slug}.mp4`;
}

/** Posters, unlike the loops, are committed static assets. */
export function posterSrc(slug: string): string {
  return `/projects/${slug}.webp`;
}

/**
 * `thumbnail` and `video` are deliberately absent from the entries below:
 * they're attached at the bottom of this file from constant/projectAssets.ts,
 * so media is declared in exactly one place. Setting them here would be
 * overwritten, and the slug would have to be spelled right in two files
 * instead of one.
 *
 * To add media: drop the poster at public/projects/{slug}.webp, upload the
 * loop to R2 as projects/{slug}.mp4, then run
 * scripts/prepare-project-assets.sh. Until a project is listed in
 * projectAssets.ts its card renders a skeleton in the 16:9 slot.
 */

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * `year` takes 2019, '2023-2026', or '2024-present' for anything still going.
 * Every year below is the shape git history actually shows — see
 * guides/project-metadata.md for how they were derived.
 *
 * Authored order is the tiebreak for projects that end in the same year, so
 * moving an entry here changes the page. Sorting happens at the bottom.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PROJECT_LIST: TProjectShowcase[] = [
  {
    // Lives inside the MES site's repo — it's the publishable slice of that
    // codebase. The site around it is its own entry, directly below.
    slug: 'hatch-booking-system',
    name: 'Hatch Booking System',
    skills: 'Next.js, TypeScript, MongoDB, NextAuth, leading a team',
    tools: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'MongoDB',
      'NextAuth',
    ],
    description:
      'A custom room booking system that McMaster engineering students use to reserve study spaces on campus, with an admin portal for managing rooms.',
    year: '2024-present',
    tags: ['at-scale', 'community', 'fullstack'],
    featured: true,
    links: [
      {
        kind: 'github',
        href: 'https://github.com/McMaster-Engineering-Society/MES-Website-App-Router',
      },
      {
        kind: 'demo',
        href: 'https://macengsociety.ca/hatch-booking',
        label: 'See it live',
      },
    ],
  },
  {
    // Same repo as Hatch, scoped to the site itself rather than the booking
    // feature — hence the frontend/design tools and no MongoDB or NextAuth.
    slug: 'mes-website',
    name: 'MES Website',
    skills: 'Next.js, TypeScript, design',
    tools: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
    description:
      'The McMaster Engineering Society site, rebuilt from Wix into Next.js. My first website development experience ever!',
    // Ties with Hatch on both bounds, so the authored order above is what
    // separates them on the page.
    year: '2024-present',
    tags: ['at-scale', 'community'],
    featured: false,
    links: [
      {
        kind: 'github',
        href: 'https://github.com/McMaster-Engineering-Society/MES-Website-App-Router',
      },
      { kind: 'demo', href: 'https://macengsociety.ca' },
    ],
  },
  {
    slug: 'finance-tracker',
    name: 'Finance Tracker',
    skills: 'Next.js, TypeScript, Supabase, Agentic Development',
    tools: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'Supabase',
      'PostgreSQL',
      'Recharts',
      'TanStack Query',
      'Zustand',
    ],
    description:
      'Tracks daily spending and money owed back from group purchases, with charts, reports, and email digests. Created to keep me mindful of my spending and visualize it better.',
    year: 2026,
    // Single-user by construction — an owner allowlist, not a product — so
    // it's personal rather than at-scale, however much machinery is in it.
    tags: ['fullstack', 'personal'],
    featured: true,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/Finance-Tracker' },
      // A separately deployed instance with seeded data. The real one holds
      // my own spending, so the demo is the only thing that can be public.
      { kind: 'demo', href: 'https://spending-demo.kylehagerman.dev' },
    ],
  },
  {
    slug: 'job-application-tracker',
    name: 'Job Application Tracker',
    skills: 'Next.js Server Actions, a LaTeX resume pipeline',
    tools: [
      'Next.js',
      'React',
      'TypeScript',
      'Supabase',
      'PostgreSQL',
      'Mantine',
      'GitHub Actions',
      'LaTeX',
    ],
    description:
      'Tracks job applications, their event timelines, and the resume version each used (auto-compiled from the LaTeX code into a pdf!).',
    year: 2026,
    tags: ['personal', 'fullstack'],
    featured: true,
    links: [
      {
        kind: 'github',
        href: 'https://github.com/HagOrMan/Job-Application-Tracker',
      },
      // Same deal as Finance Tracker: a seeded public instance, since the
      // live one is my own job search.
      { kind: 'demo', href: 'https://jobs-demo.kylehagerman.dev' },
    ],
  },
  {
    // The poster and loop were already named dino-mind, so the slug follows
    // them rather than the repo's one-word DinoMind — renaming an R2 object
    // is more friction than a hyphen is worth.
    slug: 'dino-mind',
    name: 'DinoMind | Best Health Hack',
    skills: 'React Native, Expo, LLM prompt design, team of four in 36 hours',
    // No plain 'React' on purpose: react is a direct dependency and every
    // screen is hooks and JSX, but someone filtering React wants the web one,
    // and React Native is what this actually is.
    tools: ['React Native', 'Expo', 'TypeScript', 'Cloudflare Workers AI'],
    description:
      'A journaling app whose dino companion summarizes your day, reads your mood, and plans your tomorrow.',
    year: 2024,
    tags: ['community', 'hackathon-winner'],
    featured: false,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/DinoMind' },
      // Same reasoning as MediSafe below: a recorded walkthrough, not
      // something you can click, so the default 'Try it' would oversell it.
      {
        kind: 'demo',
        href: 'https://www.youtube.com/watch?v=Judn3wLojLc',
        label: 'Watch it',
      },
      { kind: 'article', href: 'https://devpost.com/software/dinomind' },
    ],
  },
  {
    slug: 'island-builder',
    name: 'Island Builder',
    skills: 'Java, procedural generation, Dijkstra pathfinding',
    tools: ['Java', 'Maven', 'JTS Topology Suite'],
    description:
      'Generates procedural islands with biomes, rivers, and lakes, then maps road networks connecting their cities.',
    year: 2023,
    tags: ['no-ai'],
    featured: false,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/Island_Builder' },
    ],
  },
  {
    slug: 'medisafe',
    name: 'MediSafe | Top 3 Finalist',
    skills: 'Flutter, Flask, Java web scraping, team of four in a weekend',
    tools: ['Flutter', 'Python', 'Flask', 'Java'],
    description:
      "Scan a medication's barcode with your phone and see which drugs it dangerously interacts with, ensuring you never experience any adverse effects.",
    year: 2023,
    tags: ['no-ai', 'hackathon-winner'],
    featured: true,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/Medisafe' },
      // A recorded GDSC presentation rather than a live demo, hence the label
      // override — the default 'Try it' would promise something clickable.
      {
        kind: 'demo',
        href: 'https://youtu.be/Iw4qVYG9r40',
        label: 'Watch it',
      },
      {
        kind: 'article',
        href: 'https://devpost.com/software/pocket-drugs',
      },
    ],
  },
  {
    slug: 'monpoke',
    name: 'MonPoke',
    skills: 'Python, Pygame, trajectory & collision math',
    tools: ['Python', 'Pygame'],
    description:
      'Throw pokeballs to catch pokemon with fully custom animations, then browse your collection in a pokedex where you can level up your monpokes!',
    year: '2021-2022',
    tags: ['personal', 'no-ai'],
    featured: true,
    links: [{ kind: 'github', href: 'https://github.com/HagOrMan/MonPoke' }],
  },
  {
    slug: 'piraten-kapern',
    name: 'Piraten Kapern',
    skills: 'Java, strategy-pattern simulation design',
    tools: ['Java', 'Maven', 'Log4j2'],
    description:
      'Simulates 42 games of the dice board game Piraten Kapern between two bot players and reports win rates.',
    year: 2023,
    tags: ['no-ai'],
    featured: false,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/Piraten-Kapern' },
    ],
  },
  {
    slug: 'infinity-chess',
    name: 'Infinity Chess',
    skills: 'Python, Pygame, chess rules written from scratch',
    tools: ['Python', 'Pygame'],
    description:
      "Chess where the board's left and right edges wrap around, so pieces attack through the walls.",
    year: 2021,
    tags: ['personal', 'no-ai'],
    featured: true,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/infinity-chess' },
    ],
  },
  {
    // Ties with Infinity Chess on both bounds, so this sits below it purely
    // because it's authored second.
    slug: 'flappy-bird',
    name: 'Flappy Bird',
    skills: 'Python, Pygame, custom jump physics and collision detection',
    tools: ['Python', 'Pygame'],
    description:
      'A Flappy Bird clone with a solo mode and a two-player duel, with animations for jumping and falling.',
    year: 2020,
    tags: ['personal', 'no-ai'],
    featured: false,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/Flappy-Bird' },
    ],
  },
];

/** Attaches the poster and loop for any project the manifest lists. */
function withAssets(project: TProjectShowcase): TProjectShowcase {
  const { slug } = project;
  if (!PROJECT_MEDIA.includes(slug)) return project;

  return {
    ...project,
    thumbnail: posterSrc(slug),
    video: previewVideoSrc(slug),
  };
}

/**
 * Newest first, by the year each project last saw work — anything marked
 * 'present' leads. Array.prototype.sort is stable, so projects that tie keep
 * the authored order above, which is the tiebreak the cards rely on.
 */
export const projects: TProjectShowcase[] = [...PROJECT_LIST]
  .sort((a, b) => compareProjectYears(a.year, b.year))
  .map(withAssets);
