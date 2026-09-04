/**
 * Every work and volunteering entry the /experience timeline renders.
 *
 * Adding an entry is a single edit: append an object to `experiences` below.
 * Ordering is derived (see `sortedExperiences`), so the authored order here
 * carries no meaning and nothing needs reshuffling when you add something in
 * the middle of your history.
 *
 * Media lives in /public:
 *   - logos  -> /public/logos/{slug}.png        (small, square-ish, 200x200)
 *   - photos -> /public/experiences/{slug}.webp (up to 2160px on the long edge)
 * The timeline itself never renders a photo wider than 472 CSS px (see
 * PHOTO_SIZES), so 1080 would be plenty for it - the ceiling is set by
 * ZoomImage, which blows the same file up to fill the screen when someone
 * clicks it. So export from the original at up to 2160 and never upscale: a
 * 1080px file stretched across a laptop is exactly the softness this is
 * avoiding, and a file that never had the pixels can't be given them back.
 *
 * A logo whose file isn't there yet falls back to an org monogram rather than
 * a broken image, so a half-filled entry still renders - see LogoMark.
 */

export type ExperienceKind = 'coop' | 'volunteering';

/**
 * The org's mark. Small, square-ish, and sits beside the role title inside
 * the card - so it reads as identification, not decoration.
 */
export interface ExperienceLogo {
  src: string;
  alt: string;
}

/**
 * An illustration for the entry, and the only thing on the page that leaves
 * the card. On desktop it sits in the empty half of the timeline opposite the
 * card; below `md` there is no empty half, so it drops into the card beneath
 * the heading.
 */
export interface ExperiencePhoto {
  src: string;
  alt: string;
  caption?: string;
  /**
   * Intrinsic pixel size. Give both and the image renders at its true aspect
   * ratio - nothing cropped, no letterbox bars, and the right amount of space
   * reserved before it loads. Leave them off and it falls back to a 16:9 box
   * with the image contained inside it, which is safe but will letterbox
   * anything that isn't 16:9.
   */
  width?: number;
  height?: number;
}

export interface Experience {
  /** Stable slug. Becomes the DOM id, so it's also the deep link: /experience#scotiabank */
  id: string;
  kind: ExperienceKind;
  org: string;
  role: string;
  location?: string;
  /** "YYYY-MM". Also the sort key. */
  start: string;
  /** "YYYY-MM", or 'present' for anything still going. */
  end: string | 'present';
  /** 1-2 sentences. Always visible, never behind the accordion. */
  summary: string;
  /**
   * LinkedIn-level bullets, revealed on expand. Plain text - no links.
   *
   * Optional, and left off where the summary already says everything worth
   * saying. A card with no bullets renders with no More button rather than
   * with a disclosure that opens onto nothing.
   */
  details?: string[];
  stack?: string[];
  /**
   * Both are optional and independent: an entry can carry a logo, a photo,
   * both, or neither, and the card lays itself out around whatever is there.
   */
  logo?: ExperienceLogo;
  photo?: ExperiencePhoto;
  /**
   * The org itself - its site, or the page announcing the thing. Renders as
   * the link on the org's name in the card heading.
   */
  href?: string;
  /**
   * A post of mine on LinkedIn about this experience, if there is one. Renders
   * as a labelled link in the card's action row, beside More/Less.
   *
   * Independent of `href`: that one is "who this was with", this one is "what
   * I wrote about it", and an entry can carry either, both, or neither. Point
   * it at the post itself (the /posts/ or /feed/update/ permalink), not at my
   * profile - the label promises a post.
   */
  linkedin?: string;
}

/** Node shape differs by kind, so the timeline prints a legend from this. */
export const KIND_LABELS: Record<ExperienceKind, string> = {
  coop: 'Co-op',
  volunteering: 'Volunteering',
};

export const experiences: Experience[] = [
  // ----------------------------- Coop -----------------------------
  {
    id: 'scotiabank',
    kind: 'coop',
    org: 'Scotiabank',
    role: 'Global Equity Trading Developer, Co-op',
    location: 'Toronto, ON',
    start: '2024-09',
    end: '2025-08',
    summary:
      'Worked on the Algorithmic Trading team, where I owned the Security Master - the source of truth the trading floor relies on to know what a given stock actually is.',
    details: [
      'Took ownership of an MVP and built it into a production-grade Security Master that centralizes and enriches stock data from 8 external sources (e.g., Bloomberg) into SQL, driving adoption across 3 equity trading teams and directly informing algorithmic trading decisions.',
      'Replaced a compliance-flagged Python trade handler with an industry-standard Java FIX engine (QuickFIX/J), de-risking a real-time pipeline behind a multi-million dollar business line while sustaining 1M+ daily transactions feeding real-time and end-of-day reporting.',
      `Redesigned trader-facing workflows in Angular, consolidating multi-page client onboarding into a single view with bulk-add functionality; built the supporting Node.js/Express/MongoDB service layer and reusable components adopted across the team's 6 internal trading apps.`,
      'Onboarded a new team onto the data set: worked through calls with Bloomberg to find a field that met their data-quality requirement, then coordinated several internal teams to bring it into the bank.',
      'Built a Python web scraper flagging anomalous high-notional trades, producing a daily signal used by 15 equity traders.',
      'Automated daily P&L and client-facing reporting in Python, removing manual steps and saving the team 6 hours weekly.',
    ],
    stack: ['Python', 'Java', 'Angular (MEAN)', 'SQL'],
    logo: {
      src: '/logos/scotiabank.png',
      alt: 'Scotiabank logo',
    },
    photo: {
      src: '/experiences/scotia-christmas.webp',
      alt: 'Outside of my office in the winter',
      caption: 'The view from outside my office during Christmas',
      width: 1080,
      height: 810,
    },
    href: 'https://www.scotiabank.com',
    linkedin:
      'https://www.linkedin.com/posts/kyle-hagerman-se_i-just-wrapped-up-my-one-year-co-op-at-scotiabank-activity-7367375294803976193-4rSy?utm_source=share&utm_medium=member_desktop&rcm=ACoAADfaWEcBdC0j1c09zJFNEe2KwpuIz95fElU',
  },
  {
    id: 'gradient-ascent-ai',
    kind: 'coop',
    org: 'Gradient Ascent AI',
    role: 'Data Scientist AI/ML',
    start: '2023-05',
    end: '2024-08',
    summary:
      'Built AI tools at the frontier, developing internal agents and knowledge retrieval before any big tech releases.',
    details: [
      'Built an AI agent deployed to Slack using Llama 3, custom vector search, and HubSpot CRM integration to allow users to query 217,000+ historical sales using natural language, surfacing 20+ actionable leads in its first week. The underlying pipeline uses a custom autonomous tool selection to translate queries into metadata-filtered searches, displaying its reasoning chain directly in Slack threads for full transparency.',
      'Increased lead generation by 40% by building a weekly pipeline that aggregated job postings, LinkedIn data, and CRM records to automatically surface warm contacts already connected to target companies.',
      'Deployed open-source models and reasoning endpoints on Azure ML Studio, using an Azure VM middleware layer running Socket Mode connections for real-time Slack communication.',
      'Deployed a production ML inference API (Flask + GCP) for a client, enabling at-home patient scanning for the first time, handling image retrieval from Cloud Storage and secured endpoints for external use.',
      'Trained a ResNet-18 deep learning model in Azure ML Studio to automatically grade card quality, replacing a previously manual assessment process.',
      'Built a self-hosted document Q&A demo using Llama 2, LangChain, and a vector database as a private alternative to ChatGPT, which was used in enterprise prospect conversations to open doors with new clients.',
    ],
    stack: ['Python', 'Agentic Architecture', 'Azure', 'GCP'],
    logo: {
      src: '/logos/gradient-ascent.png',
      alt: 'Gradient Ascent AI logo',
    },
    href: 'https://gradient-ascent.com/',
  },
  {
    id: 'fedex',
    kind: 'coop',
    org: 'FedEx',
    role: 'Associate Programmer Analyst',
    location: 'Mississauga, ON',
    start: '2022-05',
    end: '2022-08',
    summary:
      'Worked with Business Intelligence Analysts for ETL processes and scripting.',
    details: [
      'Reworked an existing data pipeline in Azure to use a new source, validated the new data, optimized the process, and created documentation from scratch on the pipeline.',
      'Assisted in data reporting activities using TIBCO Spotfire and Power BI, creating dashboards and data feeds tied to vaccine reporting.',
      'Assisted in data extraction, data warehouse and data lake development using Microsoft Azure, creating new data pipelines for a predictive analysis project.',
    ],
    stack: ['SQL', 'Microsoft Azure', 'Power BI', 'Data Pipelines'],
    logo: {
      src: '/logos/fedex.png',
      alt: 'FedEx logo',
    },
    photo: {
      src: '/experiences/fedex-plane-pull.webp',
      alt: 'Me at the FedEx plane pull',
      caption: 'Me at the FedEx plane pull!',
      width: 1080,
      height: 810,
    },
    href: 'https://www.fedex.com/en-ca/home.html',
  },
  {
    id: 'mcmaster-ta-discrete-math',
    kind: 'coop',
    org: 'McMaster University',
    role: 'Discrete Mathematics TA',
    location: 'Hamilton, ON',
    start: '2024-01',
    end: '2024-04',
    summary:
      'Worked as a grading TA for the Software Engineering Discrete Mathematics II course (SFWRENG 2FA3).',
    details: [
      'Graded discrete mathematics assigments and provided comprehensive feedback and points for improvement.',
      'Promptly handled all assignment inquiries within one day to ensure students always had support.',
    ],
    stack: ['Communication', 'Feedback'],
    logo: {
      src: '/logos/mcmaster-engineering.png',
      alt: 'McMaster Engineering logo',
    },
    href: 'https://www.mcmaster.ca/',
  },

  // ----------------------------- Volunteering -----------------------------
  {
    id: 'mcmaster-engineering-society',
    kind: 'volunteering',
    org: 'McMaster Engineering Society',
    role: 'Infrastructure Technology Manager',
    location: 'Hamilton, ON',
    start: '2024-05',
    end: 'present',
    summary:
      "I lead around 20 developers building the tools McMaster's engineering student body uses, our flagship being a custom booking portal for study rooms.",
    details: [
      'Overhauled the Engineering room booking experience for 2,100+ students, replacing a room-first flow that took 2 minutes to book with a time-first interface showing all available rooms instantly.',
      'Scaled the team to 20 developers across four teams shipping Next.js & Tailwind CSS features on the MES platform, growing output from ~20 to ~200 PRs/year across 3 new projects, owning code reviews and deployments.',
      'Built McMaster-integrated Single Sign-On (SSO) from scratch, restricting access to verified students and staff.',
      'Led weekly sprints for my 3 projects, translated user needs into software requirements tracked through GitHub Kanban Boards, and managed society and student feedback.',
    ],
    stack: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'MongoDB',
      'NextAuth',
    ],
    logo: {
      src: '/logos/mcmaster_engineering_society.png',
      alt: 'McMaster Engineering Society logo',
    },
    photo: {
      src: '/experiences/booking-portal.webp',
      alt: 'The custom booking portal from a user perspective',
      caption: 'Our custom booking portal, as seen by the students',
      // The file's real pixels - it's 2.26:1, far wider than any fixed frame
      // would have allowed, so it renders at its own ratio instead.
      width: 1080,
      height: 478,
    },
    href: 'https://macengsociety.ca',
    linkedin:
      'https://www.linkedin.com/posts/kyle-hagerman-se_at-our-2025-fireball-our-undergraduate-engineering-activity-7289841812318429184-xmKY?utm_source=share&utm_medium=member_desktop&rcm=ACoAADfaWEcBdC0j1c09zJFNEe2KwpuIz95fElU',
  },
  {
    id: 'mcmaster-engineering-society-member',
    kind: 'volunteering',
    org: 'McMaster Engineering Society',
    role: 'Infrastructure Technology Member',
    location: 'Hamilton, ON',
    start: '2023-05',
    end: '2024-04',
    summary:
      'I remade the McMaster Engineering Society website from scratch, my first ever website development experience!',
    details: [
      'Rebuilt the entire website alongside 4 developers in Nextjs and Reactjs, learning React for the first time.',
      'Bootstrapped sign-on using a magic link and NextAuth to ensure only McMaster students could make accounts through their school emails.',
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
    logo: {
      src: '/logos/mcmaster_engineering_society.png',
      alt: 'McMaster Engineering Society logo',
    },
    photo: {
      src: '/experiences/mes-website.webp',
      alt: 'A page I worked on for the MES website',
      caption: 'A page I worked on, showing off engineering publications!',
      width: 1080,
      height: 493,
    },
    href: 'https://macengsociety.ca',
  },
  {
    id: 'ontario-engineering-competition-2025',
    kind: 'volunteering',
    org: 'Ontario Engineering Competition 2025',
    role: 'Programming Competition Lead',
    location: 'Hamilton, ON',
    start: '2024-05',
    end: '2025-01',
    summary:
      'Co-led the Programming Competition at the Ontario Engineering Competition, a provincial event drawing school-level winners from across Ontario, running an 8-month planning cycle from problem design through judging day.',
    details: [
      'Designed the competition problem around the "Solutions that Last" theme, deliberately scoping it open-ended: anchored teams in disaster warning and response for direction while leaving the domain broad enough that solutions had to be original rather than pattern-matched to a known answer.',
      'Paired the outline with stated design rationale and required qualities so teams understood what a lasting system needed without being steered toward one product.',
      'Built the judging rubric with my co-lead, weighting real-world applicability, design justification, and readability over raw code volume, then briefed 3 judges on scoring intent and resolved calibration questions live during grading to keep scoring consistent across teams.',
      'Ran day-of logistics for the track across 20 teams, prepping each group before entry, enforcing presentation and Q&A timing, and rotating judging blocks so every panel had grading time between teams. Every block ran on schedule start to finish.',
    ],
    stack: ['Organization', 'Coordination', 'Problem-scoping'],
    logo: {
      src: '/logos/oec-2025.png',
      alt: 'Ontario Engineering Competition 2025 logo',
    },
    photo: {
      src: '/experiences/oec-winners.webp',
      alt: 'Myself, my co-lead, and one of the winning teams at the competition',
      caption: 'My co-lead and I with a finalist team at the competition!',
      width: 1080,
      height: 798,
    },
    href: 'https://www.eng.mcmaster.ca/news/solutions-that-last-the-focus-of-mcmaster-student-hosted-ontario-engineering-competition/',
    linkedin:
      'https://www.linkedin.com/posts/kyle-hagerman-se_what-a-weekend-at-the-ontario-engineering-activity-7296954533425917952-uope?utm_source=share&utm_medium=member_desktop&rcm=ACoAADfaWEcBdC0j1c09zJFNEe2KwpuIz95fElU',
  },
  {
    id: 'hdsb-hackathon-judge-2023',
    kind: 'volunteering',
    org: 'Halton District School Board',
    role: 'HDSB Hacks Judge',
    start: '2023-03',
    end: '2023-04',
    summary: `I had the incredible opportunity to volunteer as a hackathon judge for HDSB's first ever high school hackathon!`,
    details: [
      'Reviewed a dozen projects for finalists and gave personalized feedback for each one.',
      'Involved in coordinating with hackathon planners to assign category winners, from best hardware/software hack to education or sustainability hack.',
    ],
    logo: {
      src: '/logos/hdsb.png',
      alt: 'Halton District School Board logo',
    },
    photo: {
      src: '/experiences/hdsb-hacks-2023-infograph.webp',
      alt: 'Infographic for HDSB hacks',
      width: 1200,
      height: 1200,
    },
    href: 'https://linktr.ee/hdsbhackathon2023',
  },
  {
    id: 'mcmaster-engineering-musical-2024',
    kind: 'volunteering',
    org: 'McMaster Engineering Musical',
    role: 'Writer',
    location: 'Hamilton, ON',
    start: '2023-09',
    end: '2024-03',
    summary:
      "My first year in the writing crew for McMaster Engineering's fully student-produced musical, this year based on Beetlejuice.",
    stack: ['Collaborative Writing', 'Editing'],
    logo: {
      // No file yet - renders as an "MM" monogram until one lands in /public.
      src: '/logos/mcmaster-engineering.png',
      alt: 'McMaster Engineering Musical logo',
    },
    photo: {
      src: '/experiences/musical-writing-crew-2024.webp',
      alt: 'The writing crew for the 2024 McMaster Engineering Musical',
      caption: 'The writing crew behind the 2024 show',
      width: 2048,
      height: 1142,
    },
    href: 'https://www.macengmusical.com/past-shows',
  },
  {
    id: 'mcmaster-engineering-musical-2025',
    kind: 'volunteering',
    org: 'McMaster Engineering Musical',
    role: 'Writer',
    location: 'Hamilton, ON',
    start: '2024-09',
    end: '2025-03',
    summary:
      'Back in the writing crew for a second show, this time based on the Odyssey! (before Nolan ever announced his version).',
    stack: ['Collaborative Writing', 'Editing'],
    logo: {
      src: '/logos/mac-eng-musical-2025.png',
      alt: 'McMaster Engineering Musical logo',
    },
    photo: {
      src: '/experiences/musical-writing-crew-2025.webp',
      alt: 'The writing crew for the 2025 McMaster Engineering Musical',
      caption: 'The writing crew behind the 2025 show',
      width: 2048,
      height: 1365,
    },
    href: 'https://www.macengmusical.com/past-shows',
  },
];

/** Sorts above every real "YYYY-MM", so ongoing entries win their tiebreak. */
const ONGOING_KEY = '9999-12';

const endKey = (experience: Experience) =>
  experience.end === 'present' ? ONGOING_KEY : experience.end;

/** Descending string compare. "YYYY-MM" sorts correctly as plain text. */
const descending = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

/**
 * Newest first, derived from `start` - so adding an entry never means
 * reordering the array above by hand. Two entries that started in the same
 * month fall back to whichever ran later.
 */
export const sortedExperiences: Experience[] = [...experiences].sort(
  (a, b) => descending(a.start, b.start) || descending(endKey(a), endKey(b)),
);

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** What an ongoing entry renders instead of an end date. */
export const PRESENT_LABEL = 'Present';

export interface FormattedDate {
  /** "Jan 2025" */
  label: string;
  /** The value for <time dateTime> - the raw "YYYY-MM". */
  dateTime: string;
}

export interface FormattedRange {
  /** "Jan 2025 — Present". For aria-labels, or anywhere one string is wanted. */
  label: string;
  start: FormattedDate;
  /** null while ongoing - "Present" isn't a date, so it gets no <time>. */
  end: FormattedDate | null;
}

/**
 * Built from the string parts rather than `new Date("2025-01")`, which parses
 * as UTC midnight and would render "Dec 2024" for anyone west of Greenwich -
 * and, with a server and a browser in different timezones, would render two
 * different months and trip a hydration mismatch.
 */
function formatMonth(value: string): FormattedDate {
  const [year, month] = value.split('-');
  const label = MONTH_LABELS[Number(month) - 1];
  return { label: label ? `${label} ${year}` : value, dateTime: value };
}

export function formatRange(
  start: string,
  end: string | 'present',
): FormattedRange {
  const from = formatMonth(start);
  const to = end === 'present' ? null : formatMonth(end);
  return {
    label: `${from.label} — ${to ? to.label : PRESENT_LABEL}`,
    start: from,
    end: to,
  };
}
