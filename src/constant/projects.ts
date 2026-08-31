import { compareProjectYears } from '@/lib/projects/year';
import { TProjectShowcase } from '@/types/projects/ProjectShowcase';

/**
 * Preview loops live in Cloudflare R2 next to the about-me videos, never in
 * this repo — same rule as constant/videos.ts. Encode a 4–6s silent loop
 * (see guides/project-metadata.md), upload it to the bucket as
 * projects/{slug}.mp4, then set `video: previewVideoSrc('the-slug')` below.
 */
const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL ?? '';

export function previewVideoSrc(slug: string): string {
  return `${R2_BASE_URL}/projects/${slug}.mp4`;
}

/**
 * Posters are static assets in this repo, unlike the videos: drop the image at
 * public/projects/{slug}.jpg and set `thumbnail: '/projects/{slug}.jpg'`.
 * Until then the card renders a skeleton in the 16:9 slot.
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
      'A custom room booking system that McMaster engineering students use to reserve study space on campus.',
    year: '2024-present',
    tags: ['at-scale', 'community', 'fullstack'],
    featured: true,
    links: [
      {
        kind: 'github',
        href: 'https://github.com/McMaster-Engineering-Society/MES-Website-App-Router',
      },
      { kind: 'demo', href: 'https://macengsociety.ca/hatch-booking' },
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
      'The McMaster Engineering Society site, rebuilt from Wix into Next.js: info pages plus club and event portals.',
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
    slug: 'island-builder',
    name: 'Island Builder',
    skills: 'Java, procedural generation, Dijkstra pathfinding',
    tools: ['Java', 'Maven', 'JTS Topology Suite'],
    description:
      'Generates procedural islands with biomes, rivers, and lakes, then maps road networks connecting their cities.',
    year: 2023,
    tags: ['no-ai', 'personal'],
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
      "Scan a medication's barcode with your phone and see which drugs it dangerously interacts with.",
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
    skills: 'Python, Pygame, trajectory and collision math',
    tools: ['Python', 'Pygame'],
    description:
      'Throw pokeballs at wild pokemon to catch them, then browse your collection in a full pokedex.',
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
    tags: ['no-ai', 'personal'],
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
      "Two-player chess where the board's left and right edges wrap around, so pieces attack through the walls.",
    year: 2021,
    tags: ['personal', 'no-ai'],
    featured: true,
    links: [
      { kind: 'github', href: 'https://github.com/HagOrMan/infinity-chess' },
    ],
  },
];

/**
 * Newest first, by the year each project last saw work — anything marked
 * 'present' leads. Array.prototype.sort is stable, so projects that tie keep
 * the authored order above, which is the tiebreak the cards rely on.
 */
export const projects: TProjectShowcase[] = [...PROJECT_LIST].sort((a, b) =>
  compareProjectYears(a.year, b.year),
);
