'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { LINK_META } from '@/components/projects/linkMeta';
import { ProjectPreviewVideo } from '@/components/projects/ProjectPreviewVideo';
import { actionVariants } from '@/components/ui/actionVariants';
import { Skeleton } from '@/components/ui/Skeleton';
import { ACCENT_VARS, getAccent } from '@/lib/projects/accents';
import { projectDetailHref } from '@/lib/projects/paths';
import { formatProjectYear } from '@/lib/projects/year';
import { cn } from '@/lib/utils';
import type {
  ProjectLink,
  TProjectShowcaseCard,
} from '@/types/projects/ProjectShowcase';

/**
 * The default project card: preview media on top, name + skills, the
 * description, and a footer of year and actions.
 *
 * Nothing here is a whole-card link. A card whose only destination is a
 * detail page can get away with a stretched ::after, but most of these have
 * a demo and a repo and (sometimes) nothing written up at all — an invisible
 * link under all of that is a coin flip for the reader. Every destination is
 * its own labelled control in the footer instead, "Read more" included, so
 * what a click does is whatever the thing under the cursor says it does.
 */
export const ProjectSpotlightCard = ({
  project,
  index,
  className,
}: TProjectShowcaseCard) => {
  const [active, setActive] = React.useState(false);

  const accent = getAccent(index);
  const borderColor = ACCENT_VARS[accent].border;
  const glowColor = ACCENT_VARS[accent].glow;

  // Both states are set inline because the accent varies per card, which a
  // class name can't carry — and an inline box-shadow beats any hover: class
  // anyway, so `hover:shadow-lg` here would have been dead weight.
  const restShadow = `0 0 0 1px color-mix(in srgb, ${borderColor} 30%, transparent),
     0 8px 24px -8px color-mix(in srgb, ${glowColor} 25%, transparent)`;
  // The same shadow, a step deeper and a step more saturated. Deliberately
  // not a bigger gesture: the projects are what should hold the eye, and this
  // only has to say the mouse is here.
  const hoverShadow = `0 0 0 1px color-mix(in srgb, ${borderColor} 45%, transparent),
     0 10px 28px -8px color-mix(in srgb, ${glowColor} 40%, transparent)`;

  const demo = project.links.find((link) => link.kind === 'demo');
  const others = project.links.filter((link) => link.kind !== 'demo');
  const detailHref = projectDetailHref(project);

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      // React's focus events bubble, so this covers focus anywhere inside.
      // Moving between the card's own controls isn't leaving it, hence the
      // relatedTarget check — otherwise the preview stops and restarts.
      onFocus={() => setActive(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setActive(false);
        }
      }}
      style={
        {
          backgroundColor: 'hsl(var(--card))',
          borderColor,
          boxShadow: active ? hoverShadow : restShadow,
          // The accent, published to the footer below — the same variable the
          // homepage ribbon sets on its text half, so the demo button is the
          // same component in both places.
          //
          // `text` rather than `border`: it ends up as a label and a tint,
          // which is what the text weight is tuned for. See globals.css.
          '--row-accent': ACCENT_VARS[accent].text,
        } as React.CSSProperties
      }
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden rounded-xl border',
        'transition-shadow duration-300',
        className,
      )}
    >
      <div className='bg-muted relative aspect-video w-full overflow-hidden'>
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt=''
            fill
            sizes='(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw'
            // Contain so nothing is cropped — see ProjectPreviewVideo, which
            // stacks on top of this and has to letterbox the same way.
            className='object-contain object-center'
          />
        ) : (
          <Skeleton className='size-full animate-none rounded-none' />
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

      <div className='flex flex-1 flex-col gap-1.5 p-4'>
        {/* Name and year share a line; the skills sit on the next one.

            The skills are a sibling of this row rather than a third item
            inside it, and that's the whole point: anything inside the row is
            boxed into the width the year leaves behind, so its second line
            stopped short and left a ragged column of dead space under the
            date. Out here they get the full width of the card and run under
            the year like ordinary prose.

            items-baseline so the year sits on the name's own baseline
            despite the two being different sizes. */}
        <div className='flex items-baseline justify-between gap-x-3'>
          {/* Plain text, not a link. The name is the card's label; where you
              can go from here is the footer's job. */}
          <h2 className='text-foreground min-w-0 text-lg leading-tight font-semibold'>
            {project.name}
          </h2>

          {/* Lives up here rather than in the footer: the year is metadata
              about the project, the same as the skills below it, not one
              more thing you can click. It also stops competing for width
              with the links, which is what used to strand it on a line of
              its own on a phone. shrink-0 keeps it whole — the name is what
              wraps if anything has to. */}
          <span className='text-muted-foreground shrink-0 text-sm whitespace-nowrap'>
            {formatProjectYear(project.year)}
          </span>
        </div>

        <span className='text-muted-foreground block text-sm italic'>
          {project.skills}
        </span>

        {/* Unclamped while the grid is one column: a card that owns the full
            width has room for the whole description, and clipping it there
            was only ever collateral from a rule the two-column layout needs.
            From lg up, cards share a row, so three lines with three lines
            reserved keeps the footers of a row on the same baseline. */}
        <p className='text-muted-foreground text-sm lg:line-clamp-3 lg:min-h-15'>
          {project.description}
        </p>

        {/* Fixed-height slot: a collapsing footer would leave every row of
            cards a different height.

            With the year moved up into the header, this is purely a row of
            actions, so it's free to wrap without stranding anything — each
            line holds the right edge on its own.

            Deliberately no min-w-0: a flex row that wraps can't shrink below
            its widest child, which is what stops a squeeze from being taken
            out of the buttons themselves.

            Every control comes from actionVariants, at the same height and
            radius as the homepage ribbon's row, so a project's links look the
            same on both pages. Which kinds go icon-only is LINK_META's call,
            not this file's.

            "Read more" sits last, in the corner, and is the one without a
            border. It's the only link that keeps you on the site, so it reads
            as where the card ends rather than as one more item in a row of
            outbound links. */}
        <div className='mt-auto flex min-h-9 flex-wrap items-center justify-end gap-2 pt-2'>
          {demo && <DemoLink link={demo} project={project.name} />}
          {others.map((link) => (
            <SecondaryLink key={link.href} link={link} project={project.name} />
          ))}
          {detailHref && (
            <DetailLink href={detailHref} project={project.name} />
          )}
        </div>
      </div>
    </article>
  );
};

/**
 * The only route to a project's detail page, and the only internal link on
 * the card. Rendered solely when there is a page worth the trip — see
 * `hasDetailPage` in constant/projects.ts.
 *
 * The arrow says out loud that there is more to read, in one place, rather
 * than leaving the reader to discover that the whole card was clickable.
 *
 * Deliberately the quiet one: the accent belongs on the demo button, which is
 * the action you're most likely to want.
 */
function DetailLink({ href, project }: { href: string; project: string }) {
  return (
    <Link
      href={href}
      aria-label={`Read more about ${project}`}
      className={cn(
        actionVariants({ variant: 'ghost' }),
        'group/detail cursor-pointer',
      )}
    >
      Read more
      {/* Nudges forward on hover — the arrow already points at the page, this
          just gives it somewhere to go. */}
      <ArrowRight
        className='size-3.5 transition-transform duration-200 group-hover/detail:translate-x-0.5'
        aria-hidden
      />
    </Link>
  );
}

/** The card's one filled action, in the card's own accent. */
function DemoLink({ link, project }: { link: ProjectLink; project: string }) {
  const { label, Icon } = LINK_META.demo;

  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${project} — ${link.label ?? label} (opens in a new tab)`}
      className={actionVariants({ variant: 'accent' })}
    >
      {link.label ?? label}
      <Icon className='size-3.5' aria-hidden />
    </a>
  );
}

/**
 * Everything that isn't the demo — the repo, a write-up, a download.
 *
 * `iconOnly` kinds (currently just the write-up) render as a square glyph.
 * The aria-label carries the name either way, so dropping the visible text
 * costs nothing to a screen reader — see LINK_META.
 */
function SecondaryLink({
  link,
  project,
}: {
  link: ProjectLink;
  project: string;
}) {
  const { label, Icon, iconOnly } = LINK_META[link.kind];
  const name = link.label ?? label;

  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${project} ${name} (opens in a new tab)`}
      className={actionVariants({
        variant: 'outline',
        size: iconOnly ? 'icon' : 'default',
      })}
    >
      {!iconOnly && name}
      <Icon className={iconOnly ? 'size-4' : 'size-3.5'} aria-hidden />
    </a>
  );
}
