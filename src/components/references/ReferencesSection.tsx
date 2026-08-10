'use client';

import { useState } from 'react';

import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { ReferenceCard } from '@/components/references/ReferenceCard';
import { ReferenceModal } from '@/components/references/ReferenceModal';
import { REFERENCES } from '@/constant/references';
import { LinkedInRecommendationsLink } from '@/constant/socials';
import { TReference } from '@/types/references';

/**
 * The recommendations section: every entry in REFERENCES, rendered by
 * mapping - adding a third entry needs no change here.
 *
 * The grid is `auto-fit` with a 320px floor, so the count drives the layout:
 * two cards sit side by side on desktop and stack on mobile, and a single
 * card fills the row on its own. `min(320px, 100%)` rather than a bare 320px
 * so the column can't outgrow its container on narrow phones, which would
 * push a horizontal scrollbar onto the whole page.
 *
 * Deliberately not a carousel: with a handful of items a slider hides most
 * of the content, breaks skimming, and adds keyboard/screen-reader problems
 * that a plain grid simply doesn't have.
 */
export function ReferencesSection() {
  // One modal shared by every card; null means closed.
  const [openReference, setOpenReference] = useState<TReference | null>(null);

  if (REFERENCES.length === 0) return null;

  const linkLabel =
    REFERENCES.length > 1 ? 'View all on LinkedIn' : 'View on LinkedIn';

  return (
    <section className='mx-auto w-full max-w-5xl px-6 py-16 md:px-10 md:py-24'>
      <h2 className='mb-8 text-3xl font-bold'>
        From people I&apos;ve worked with
      </h2>

      {/* role='list' because Tailwind's preflight strips list-style, which
          makes Safari/VoiceOver drop the list semantics entirely. */}
      <ul
        role='list'
        className='grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-stretch gap-8'
      >
        {REFERENCES.map((reference) => (
          <li key={reference.name} className='flex'>
            <ReferenceCard
              reference={reference}
              onReadFull={() => setOpenReference(reference)}
            />
          </li>
        ))}
      </ul>

      {/* Corroboration, not the destination - the full text lives on this
          site, and this is the "these are real" link. One per section rather
          than one per card, since it's the same URL either way. */}
      <a
        href={LinkedInRecommendationsLink}
        target='_blank'
        rel='noopener noreferrer'
        className='text-breeze-900/80 hover:text-breeze-700 dark:text-breeze-300/75 dark:hover:text-breeze-300 cursor-newtab mt-8 inline-flex items-center gap-2 text-sm motion-safe:transition-colors'
      >
        <LinkedInIcon className='h-4 w-4' useThemeForImgSource />
        {linkLabel}
      </a>

      <ReferenceModal
        reference={openReference}
        onClose={() => setOpenReference(null)}
      />
    </section>
  );
}
