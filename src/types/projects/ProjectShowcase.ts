/**
 * Tag keys are slugs rather than display labels because they go straight into
 * the `?tags=` query param — `no-ai` beats `No%20AI` in a shared link. The
 * human-facing label lives in TAG_META alongside the description.
 *
 * Insertion order here is the order the chips render in, so 'no-ai' leads.
 * A tag no project uses is still valid to declare — it just doesn't render a
 * chip until something is tagged with it (see collectTags in lib/projects).
 */
export const TAG_META = {
  'no-ai': {
    label: 'No AI',
    description:
      'AI is important, but these projects show how I think and structure my code without it.',
  },
  fullstack: {
    label: 'Fullstack',
    description: 'Has both a frontend and a backend I built.',
  },
  community: {
    label: 'Community',
    description: 'Built for the benefit of other people.',
  },
  personal: { label: 'Personal', description: 'A personal side project.' },
  work: { label: 'Work', description: 'Built professionally or for a client.' },
  'at-scale': {
    label: 'At Scale',
    description: 'A project that makes an impact at scale.',
  },
  'hackathon-winner': {
    label: 'Hackathon Winner',
    description: 'A winning project at a hackathon!',
  },
} as const satisfies Record<string, { label: string; description: string }>;

export type ProjectTag = keyof typeof TAG_META;

/** Chip order in the filter bar — the declaration order of TAG_META. */
export const TAG_ORDER = Object.keys(TAG_META) as ProjectTag[];

/**
 * The controlled vocabulary behind the Tools filter. Tools are matched by
 * exact string, so a typo would silently become a filter option that matches
 * nothing — typing `tools` against this list turns that into a compile error.
 *
 * Everything here is something I've actually built with: either a project
 * below uses it, or this website does. Add an entry when a real project needs
 * it, not in advance — a vocabulary full of things I've never touched is a
 * list of guesses waiting to be miscopied into a card.
 */
export const TOOLS = [
  'Flask',
  'Java',
  'JavaScript',
  'Next.js',
  'MongoDB',
  'Pygame',
  'Python',
  'React',
  'Supabase',
  'Tailwind CSS',
  'Three.js',
  'TypeScript',
] as const;

export type ProjectTool = (typeof TOOLS)[number];

/**
 * A project's dates, as one value you type once:
 *
 *   2019             a single year
 *   '2023-2026'      a range
 *   '2024-present'   still going
 *
 * The template literal types mean a malformed range ('2024 - present',
 * 'summer 2023') is a compile error rather than something that quietly
 * renders as garbage on a card. Parsing, formatting and sorting all live in
 * lib/projects/year.ts.
 */
export type ProjectYear = number | `${number}-${number}` | `${number}-present`;

export type ProjectLinkKind = 'github' | 'demo' | 'download';

export type ProjectLink = {
  kind: ProjectLinkKind;
  href: string;
  /** Overrides the default label for this kind. Rarely needed. */
  label?: string;
};

export type TProjectShowcase = {
  /** Must match a directory under src/app/projects — asserted at build time. */
  slug: string;
  name: string;
  /**
   * Prose for humans, rendered in italics beside the name ("Java, generator").
   * Deliberately separate from `tools`: this one is allowed to be a sentence,
   * name a skill that isn't a tool, and never drives a filter.
   */
  skills: string;
  /** The filter key. Normalised, exact-matched, drives the Tools dropdown. */
  tools: ProjectTool[];
  /** One or two sentences. Clamped to two lines on the card. */
  description: string;
  /** 2019, '2023-2026', or '2024-present' — see lib/projects/year.ts. */
  year: ProjectYear;
  tags: ProjectTag[];
  featured: boolean;
  /** Poster image, also the <video> poster. Cards fall back to a skeleton. */
  thumbnail?: string;
  /** 4–6s silent loop. Omit until one exists — the card just shows the poster. */
  video?: string;
  links: ProjectLink[];
};

export type TProjectShowcaseCard = {
  project: TProjectShowcase;
  /** Position among the *visible* cards — drives accent rotation and stagger. */
  index: number;
  className?: string;
};
