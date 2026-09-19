'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

import { LinkedInPostLink } from '@/components/experience/LinkedInPostLink';
import { Chip } from '@/components/ui/Chip';
import { type Experience, formatRange, KIND_LABELS } from '@/data/experiences';
import { homeExperiences } from '@/lib/home/showcase';

import { RibbonRow } from './RibbonRow';
import { RibbonSection } from './RibbonSection';
import { RibbonEyebrow, RibbonProse } from './RibbonText';

/** Half the ribbon's column at its widest, which is all these ever render at. */
const PHOTO_SIZES = '(min-width: 768px) 440px, 100vw';

/**
 * The experience half of the homepage ribbon: the two entries that claim a
 * `homeSlot`, previewed, with everything else a click away on /experience.
 *
 * Content deliberately mirrors what the timeline shows above its accordion —
 * the summary, the stack, the LinkedIn post — and stops there. The bullets
 * are what /experience is for, and duplicating them here would make the
 * "preview" longer than the thing it previews.
 */
export function ExperienceRibbon({ indexOffset }: { indexOffset: number }) {
  if (homeExperiences.length === 0) return null;

  return (
    <RibbonSection
      title="Places I've worked"
      href='/experience'
      linkLabel='See everywhere else'
    >
      {homeExperiences.map((experience, position) => (
        <ExperienceRow
          key={experience.id}
          experience={experience}
          index={indexOffset + position}
          showDivider={position > 0}
        />
      ))}
    </RibbonSection>
  );
}

function ExperienceRow({
  experience,
  index,
  showDivider,
}: {
  experience: Experience;
  index: number;
  showDivider: boolean;
}) {
  const { id, org, role, kind, photo, logo, href, linkedin, stack } = experience;
  const range = formatRange(experience.start, experience.end);

  return (
    <RibbonRow
      index={index}
      showDivider={showDivider}
      media={
        photo ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            // The data carries real pixel dimensions, so these render at
            // their own aspect ratio and rows end up different heights on
            // purpose. A uniform frame is the one thing that would put the
            // grid back into a layout built to not have one.
            width={photo.width ?? 1080}
            height={photo.height ?? 810}
            sizes={PHOTO_SIZES}
            // `block` matters more than it looks: an inline <img> leaves a
            // few pixels of baseline gap under it, and the wrapper that gap
            // sits in is the box the hover glint sweeps. Left inline, the
            // glint would run a sliver past the bottom of the photo.
            className='block h-auto w-full'
          />
        ) : null
      }
    >
      <RibbonEyebrow>
        {KIND_LABELS[kind]} · {range.label}
      </RibbonEyebrow>

      {/* A link, and the row's way into the timeline entry it previews —
          which is also where the bullets this leaves out are. */}
      <h3 className='text-xl leading-tight font-semibold md:text-2xl'>
        <Link
          href={`/experience#${id}`}
          className='animated-underline hover:text-foreground'
        >
          {role}
        </Link>
      </h3>

      <OrgLine org={org} href={href} logo={logo} />

      <RibbonProse>{experience.summary}</RibbonProse>

      {stack && stack.length > 0 && (
        <ul role='list' className='flex flex-wrap gap-1.5'>
          {stack.map((tool) => (
            <li key={tool}>
              <Chip
                style={{
                  color: 'var(--row-accent)',
                  backgroundColor:
                    'color-mix(in srgb, var(--row-accent) 12%, transparent)',
                }}
              >
                {tool}
              </Chip>
            </li>
          ))}
        </ul>
      )}

      {linkedin && (
        <div className='pt-1'>
          <LinkedInPostLink href={linkedin} org={org} role={role} />
        </div>
      )}
    </RibbonRow>
  );
}

/**
 * The org's mark and name. Deliberately not the timeline's LogoMark: that one
 * is sized and animated for a card's outer corner and carries the timeline's
 * own motion variants, none of which mean anything here — and importing it
 * would drag ZoomImage and the timeline's motion module onto the homepage.
 *
 * The arrow matches how the timeline marks a linked org, so the same thing
 * looks clickable in both places.
 */
function OrgLine({
  org,
  href,
  logo,
}: {
  org: string;
  href?: string;
  logo?: Experience['logo'];
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className='flex items-center gap-2.5'>
      {logo && !logoFailed && (
        <span className='bg-muted border-border relative size-8 shrink-0 rounded-md border p-1'>
          <Image
            src={logo.src}
            alt=''
            fill
            sizes='32px'
            className='object-contain p-0.5'
            onError={() => setLogoFailed(true)}
          />
        </span>
      )}

      {href ? (
        <a
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={`${org} (opens in a new tab)`}
          className='text-muted-foreground hover:text-foreground group/org inline-flex items-center gap-0.5 text-sm font-medium transition-colors'
        >
          {org}
          <ArrowUpRight
            className='size-3.5 transition-transform duration-200 group-hover/org:-translate-y-0.5 group-hover/org:translate-x-0.5'
            aria-hidden
          />
        </a>
      ) : (
        <span className='text-muted-foreground text-sm font-medium'>{org}</span>
      )}
    </div>
  );
}
