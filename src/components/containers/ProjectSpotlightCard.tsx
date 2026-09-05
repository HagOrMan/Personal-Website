'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Download, ExternalLink, FileText, Github } from 'lucide-react';

import { ProjectPreviewVideo } from '@/components/projects/ProjectPreviewVideo';
import { Skeleton } from '@/components/ui/Skeleton';
import { ACCENT_VARS, getAccent } from '@/lib/projects/accents';
import { projectHref } from '@/lib/projects/paths';
import { formatProjectYear } from '@/lib/projects/year';
import { cn } from '@/lib/utils';
import type {
  ProjectLink,
  ProjectLinkKind,
  TProjectShowcaseCard,
} from '@/types/projects/ProjectShowcase';

const LINK_META: Record<
  ProjectLinkKind,
  { label: string; Icon: typeof Github }
> = {
  github: { label: 'on GitHub', Icon: Github },
  demo: { label: 'Try it', Icon: ExternalLink },
  article: { label: 'write-up', Icon: FileText },
  download: { label: 'download', Icon: Download },
};

/**
 * The default project card: preview media on top, name + skills, a clamped
 * description, and a footer of year and actions.
 *
 * The whole card is the link. The project name is the only anchor to the
 * detail page, and its ::after stretches over the card — no nested anchors,
 * so the footer's external links stay real links and screen readers get one
 * meaningful target named after the project rather than a "Read more".
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
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderColor,
        boxShadow: active ? hoverShadow : restShadow,
      }}
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-xl border',
        'transition-shadow duration-300',
        // The ring lives on the card because the link that owns focus is
        // stretched across all of it — a ring on the anchor alone would only
        // outline the project name.
        'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2',
        className,
      )}
    >
      <div className='bg-muted relative aspect-video w-full overflow-hidden'>
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt=''
            fill
            sizes='(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
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
        <div className='flex flex-wrap items-baseline gap-x-2'>
          <h2 className='text-foreground text-lg leading-tight font-semibold'>
            <Link
              href={projectHref(project)}
              // Picks up the card's own accent on hover — the same colour as
              // its border, so the card reads as one piece while you're on
              // it. Driven off `active` rather than a hover class because an
              // accent that varies per card can't live in a class name; the
              // upside is that keyboard focus lights it up too.
              style={{ color: active ? borderColor : undefined }}
              className='transition-colors after:absolute after:inset-0 after:content-[""] focus-visible:outline-hidden'
            >
              {project.name}
            </Link>
          </h2>
          <span className='text-muted-foreground text-sm italic'>
            {project.skills}
          </span>
        </div>

        {/* Clamped to two lines with the height of two lines reserved, so a
            one-line description doesn't shrink the card out of step with the
            rest of its row. */}
        <p className='text-muted-foreground line-clamp-2 min-h-10 text-sm'>
          {project.description}
        </p>

        {/* Fixed-height slot: most projects have no links, and a collapsing
            footer would leave every row of cards a different height. */}
        <div className='mt-auto flex min-h-9 items-center justify-between gap-2 pt-2'>
          <span className='text-muted-foreground text-sm whitespace-nowrap'>
            {formatProjectYear(project.year)}
          </span>

          <div className='relative z-[1] flex items-center gap-1'>
            {demo && <DemoLink link={demo} project={project.name} />}
            {others.map((link) => (
              <IconLink key={link.href} link={link} project={project.name} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

function DemoLink({ link, project }: { link: ProjectLink; project: string }) {
  const { label, Icon } = LINK_META.demo;

  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${project} — ${link.label ?? label} (opens in a new tab)`}
      className='border-border bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
    >
      {link.label ?? label}
      <Icon className='size-3.5' aria-hidden />
    </a>
  );
}

function IconLink({ link, project }: { link: ProjectLink; project: string }) {
  const { label, Icon } = LINK_META[link.kind];

  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${project} ${link.label ?? label} (opens in a new tab)`}
      className='text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
    >
      <Icon className='size-4' aria-hidden />
    </a>
  );
}
