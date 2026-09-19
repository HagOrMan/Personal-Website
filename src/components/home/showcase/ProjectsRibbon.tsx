'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { LINK_META } from '@/components/projects/linkMeta';
import { ProjectPreviewVideo } from '@/components/projects/ProjectPreviewVideo';
import { Skeleton } from '@/components/ui/Skeleton';
import { POSTER_SIZE } from '@/constant/projectAssets';
import { homeProjects } from '@/lib/home/showcase';
import { projectDetailHref } from '@/lib/projects/paths';
import { formatProjectYear } from '@/lib/projects/year';
import type {
  ProjectLink,
  TProjectShowcase,
} from '@/types/projects/ProjectShowcase';

import { RibbonRow } from './RibbonRow';
import { RibbonSection } from './RibbonSection';
import { RibbonEyebrow, RibbonProse } from './RibbonText';

/** Half the ribbon's column at its widest, which is all these ever render at. */
const POSTER_SIZES = '(min-width: 768px) 440px, 100vw';

/** Shape of the box for a poster whose real size isn't recorded. */
const FALLBACK_POSTER_RATIO = '16 / 10';

/**
 * The projects half of the ribbon. Same geometry as the experience half and
 * different in everything else — which is the point: one layout told twice,
 * with the media doing the distinguishing.
 *
 * No tool chips down here even though the experience rows have them. The
 * `skills` line already names the stack in prose ("Next.js, TypeScript,
 * Supabase, Agentic Development"), so chips would be the same words twice.
 * The experience rows have chips precisely because their summaries don't
 * mention a single technology.
 */
export function ProjectsRibbon({ indexOffset }: { indexOffset: number }) {
  if (homeProjects.length === 0) return null;

  return (
    <RibbonSection
      title="Things I've built"
      href='/projects'
      linkLabel='See everything else'
    >
      {homeProjects.map((project, position) => (
        <ProjectRow
          key={project.slug}
          project={project}
          index={indexOffset + position}
          showDivider={position > 0}
        />
      ))}
    </RibbonSection>
  );
}

function ProjectRow({
  project,
  index,
  showDivider,
}: {
  project: TProjectShowcase;
  index: number;
  showDivider: boolean;
}) {
  // Hover or keyboard focus anywhere in the row, not just over the poster —
  // RibbonRow owns the events and hands the state down here.
  const [active, setActive] = useState(false);

  const demo = project.links.find((link) => link.kind === 'demo');
  const others = project.links.filter((link) => link.kind !== 'demo');
  const detailHref = projectDetailHref(project);

  const poster = POSTER_SIZE[project.slug];
  const posterRatio = poster
    ? `${poster.width} / ${poster.height}`
    : FALLBACK_POSTER_RATIO;

  return (
    <RibbonRow
      index={index}
      showDivider={showDivider}
      onActiveChange={setActive}
      media={
        // The box takes the poster's own shape wherever POSTER_SIZE knows it,
        // which makes `object-contain` an exact fit rather than a letterbox.
        // That matters for more than tidiness: the fade mask, the accent glow
        // and the hover glint are all sized to this box, so a 16:10 frame
        // around a square poster had all three running over dead space beside
        // the artwork. The fallback stays a fixed frame — correct, just
        // looser — for any project whose size isn't recorded.
        <div
          className='relative w-full'
          style={{ aspectRatio: posterRatio }}
        >
          {project.thumbnail ? (
            <Image
              src={project.thumbnail}
              alt=''
              fill
              sizes={POSTER_SIZES}
              // Must match the preview video's object-fit exactly — the two
              // are stacked and crossfaded, and a mismatch shows up as the
              // image jumping when playback starts.
              className='object-contain object-center'
            />
          ) : (
            <Skeleton className='size-full animate-none' />
          )}

          {project.video && (
            <ProjectPreviewVideo
              src={project.video}
              poster={project.thumbnail}
              title={project.name}
              active={active}
            />
          )}
        </div>
      }
    >
      <RibbonEyebrow>{formatProjectYear(project.year)}</RibbonEyebrow>

      <h3 className='text-xl leading-tight font-semibold md:text-2xl'>
        {detailHref ? (
          <Link
            href={detailHref}
            className='animated-underline hover:text-foreground'
          >
            {project.name}
          </Link>
        ) : (
          // Most projects have no write-up yet, and a heading that links
          // nowhere is worse than one that doesn't pretend to. The links
          // below are where this row actually goes.
          project.name
        )}
      </h3>

      <p className='text-muted-foreground text-sm italic'>{project.skills}</p>

      <RibbonProse>{project.description}</RibbonProse>

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        {demo && <DemoLink link={demo} project={project.name} />}
        {others.map((link) => (
          <SecondaryLink key={link.href} link={link} project={project.name} />
        ))}
        {detailHref && (
          <Link
            href={detailHref}
            aria-label={`Read more about ${project.name}`}
            className='text-muted-foreground hover:text-foreground group/detail inline-flex h-9 items-center gap-1.5 px-1 text-sm font-medium transition-colors'
          >
            Read more
            <ArrowRight
              className='size-3.5 transition-transform duration-200 group-hover/detail:translate-x-0.5'
              aria-hidden
            />
          </Link>
        )}
      </div>
    </RibbonRow>
  );
}

/**
 * The row's one filled control. Takes the row accent rather than a fixed
 * colour, so the thing you're most likely to click is the same colour as the
 * glow behind the media — and it's the only fill in the row, which is what
 * makes it read as the primary action without a card to rank things inside.
 */
function DemoLink({ link, project }: { link: ProjectLink; project: string }) {
  const { label, Icon } = LINK_META.demo;

  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${project} — ${link.label ?? label} (opens in a new tab)`}
      // Everything reads --row-accent through arbitrary values rather than an
      // inline style object, and that's what makes the hover possible at all:
      // an inline backgroundColor outranks every class, so a `hover:bg-*`
      // could never have replaced it.
      //
      // Border and label hold their colour; only the fill moves, 10% -> 28%
      // of the accent. One number covers both themes because the accent has
      // already flipped lightness between them — more of a dark accent on a
      // light page reads as the button darkening, more of a light accent on a
      // dark page reads as it lightening.
      //
      // 28% rather than a nudge because the old `brightness-110` was
      // invisible in light mode by construction: a dark accent at 10% over a
      // near-white page is nearly the page already, and brightening moved it
      // closer still. Nearly tripling the tint is a step you can see without
      // the button changing into a different thing under the cursor.
      //
      // Focus-visible matches hover so the button never reacts to a mouse in
      // a way it won't react to a keyboard.
      //
      // No cursor utility: the base layer gives every a[target='_blank'] the
      // new-tab cursor, and a `cursor-pointer` class here would outrank it
      // (utilities beat base) and quietly take the icon away — which is the
      // one affordance saying this leaves the site.
      className='border-[var(--row-accent)] bg-[color-mix(in_srgb,var(--row-accent)_10%,transparent)] text-[var(--row-accent)] hover:bg-[color-mix(in_srgb,var(--row-accent)_28%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--row-accent)_28%,transparent)] focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-hidden'
    >
      {link.label ?? label}
      <Icon className='size-3.5' aria-hidden />
    </a>
  );
}

/**
 * Everything that isn't the demo. Labelled rather than the icon-only buttons
 * the /projects cards use: those sit in a footer under a bordered card that
 * gives them context, and out here a bare glyph on open background would be
 * a guess.
 */
function SecondaryLink({
  link,
  project,
}: {
  link: ProjectLink;
  project: string;
}) {
  const { label, Icon } = LINK_META[link.kind];

  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${project} ${link.label ?? label} (opens in a new tab)`}
      // Same as DemoLink: no cursor utility, so the new-tab cursor survives.
      className='border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
    >
      {link.label ?? label}
      <Icon className='size-3.5' aria-hidden />
    </a>
  );
}
