import Link from 'next/link';

import { FileText } from 'lucide-react';

import { ExclusiveAudio } from '@/components/music/ExclusiveAudio';
import { ScoreViewer } from '@/components/music/ScoreViewer';
import { actionVariants } from '@/components/ui/actionVariants';
import { mediaUrl } from '@/lib/media';
import { compositionFacts, writeupParagraphs } from '@/lib/musicFormat';
import { SITE } from '@/lib/seo';
import type { Composition } from '@/types/music';

/**
 * Everything about a piece below its title: recording, writeup, score and
 * rights line. Shared by /music/[slug] and the intercepted modal, which each
 * render their own heading - an <h1> on the page, the dialog's title in the
 * modal.
 *
 * A server component, so the writeup is in the HTML for crawlers and screen
 * readers whether or not any script runs.
 */
export function CompositionBody({ composition }: { composition: Composition }) {
  const { assets } = composition;

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-10'>
      <div className='flex flex-col gap-4'>
        <p className='text-muted-foreground text-sm'>
          {compositionFacts(composition).join(' · ')}
        </p>

        {assets ? (
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <ExclusiveAudio
              src={mediaUrl(assets.audio)}
              title={composition.title}
            />
            <Link
              href={mediaUrl(assets.pdf)}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`Open the score of ${composition.title} as a PDF (opens in a new tab)`}
              className={actionVariants({ variant: 'outline' })}
            >
              <FileText aria-hidden className='size-3.5' />
              Score PDF
            </Link>
          </div>
        ) : (
          <p className='text-foreground/75'>
            The score and recording are on their way.
          </p>
        )}
      </div>

      <section aria-label='About this piece' className='flex flex-col gap-4'>
        {writeupParagraphs(composition.writeup).map((paragraph, index) => (
          <p
            key={index}
            className='text-foreground/75 text-lg leading-relaxed whitespace-pre-line'
          >
            {paragraph}
          </p>
        ))}
      </section>

      {assets && assets.pages.length > 0 && (
        <section aria-label='Score'>
          <ScoreViewer
            title={composition.title}
            pages={assets.pages.map(mediaUrl)}
            pageWidth={assets.pageWidth}
            pageHeight={assets.pageHeight}
          />
        </section>
      )}

      <p className='text-muted-foreground text-sm'>
        © {composition.year} {SITE.author}. All rights reserved.
      </p>
    </div>
  );
}
