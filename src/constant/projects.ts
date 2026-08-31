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
 *
 * `links` are all empty because no repo/demo URLs are recorded anywhere here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PROJECT_LIST: TProjectShowcase[] = [
  {
    slug: 'hatch-booking-system',
    name: 'Hatch Booking System',
    skills: 'React, TypeScript, MongoDB, leading a team',
    tools: ['React', 'TypeScript', 'MongoDB'],
    description: 'Custom booking system used by McMaster Engineering!',
    year: 2024,
    tags: ['at-scale', 'community', 'fullstack'],
    featured: true,
    links: [],
  },
  {
    slug: 'island-builder',
    name: 'Island Builder',
    skills: 'Java, procedural generation',
    tools: ['Java'],
    description: 'Create islands with different biomes and connected cities!',
    year: 2022,
    tags: ['no-ai', 'personal'],
    featured: true,
    links: [],
  },
  {
    slug: 'medisafe',
    name: 'MediSafe',
    skills: 'Python, Flask, REST APIs',
    tools: ['Python', 'Flask'],
    description: 'Never take conflicting prescriptions again with Medisafe!',
    year: 2023,
    tags: ['hackathon-winner', 'personal'],
    featured: true,
    links: [],
  },
  {
    slug: 'monpoke',
    name: 'MonPoke',
    skills: 'Python, Pygame',
    tools: ['Python', 'Pygame'],
    description: 'Catch your favourite MonPokes using python and pygame',
    year: 2020,
    tags: ['personal'],
    featured: false,
    links: [],
  },
  {
    slug: 'piraten-kapern',
    name: 'Piraten Kapern',
    skills: 'Java, object-oriented design',
    tools: ['Java'],
    description: 'A fun implementation of a game with the same name using Java',
    year: 2021,
    tags: ['personal'],
    featured: false,
    links: [],
  },
  {
    slug: 'infinity-chess',
    name: 'Infinity Chess',
    skills: 'Python, Pygame',
    tools: ['Python', 'Pygame'],
    description: 'A Chess variant where pieces can wrap around the walls',
    year: 2019,
    tags: ['personal'],
    featured: false,
    links: [],
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
