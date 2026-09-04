/**
 * Every work and volunteering entry the /experience timeline renders.
 *
 * Adding an entry is a single edit: append an object to `experiences` below.
 * Ordering is derived (see `sortedExperiences`), so the authored order here
 * carries no meaning and nothing needs reshuffling when you add something in
 * the middle of your history.
 *
 * Media lives in /public:
 *   - logos  -> /public/logos/{slug}.png       (small, square-ish)
 *   - photos -> /public/experiences/{slug}.png (or anywhere under /public)
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
  /** LinkedIn-level bullets, revealed on expand. Plain text - no links. */
  details: string[];
  stack?: string[];
  /**
   * Both are optional and independent: an entry can carry a logo, a photo,
   * both, or neither, and the card lays itself out around whatever is there.
   */
  logo?: ExperienceLogo;
  photo?: ExperiencePhoto;
  href?: string;
}

/** Node shape differs by kind, so the timeline prints a legend from this. */
export const KIND_LABELS: Record<ExperienceKind, string> = {
  coop: 'Co-op',
  volunteering: 'Volunteering',
};

export const experiences: Experience[] = [
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
    stack: ['Python', 'Java', 'Angular (MEAN)'],
    logo: {
      src: '/logos/scotiabank.png',
      alt: 'Scotiabank logo',
    },
    href: 'https://www.scotiabank.com',
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
    id: 'mcmaster-engineering-society',
    kind: 'volunteering',
    org: 'McMaster Engineering Society',
    role: 'Infrastructure Technology Manager',
    location: 'Hamilton, ON',
    start: '2022-09',
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
      src: '/experiences/booking-portal.png',
      alt: 'The custom booking portal from a user perspective',
      caption: 'Our custom booking portal, as seen by the students',
      // The file's real pixels - it's 2.26:1, far wider than any fixed frame
      // would have allowed, so it renders at its own ratio instead.
      width: 1280,
      height: 566,
    },
    href: 'https://macengsociety.ca',
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
