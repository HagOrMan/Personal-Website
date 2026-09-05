import Link from 'next/link';

import { ArrowLeft, Mail } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PROJECTS_BASE_PATH } from '@/lib/projects/paths';

/**
 * The placeholder body for a project whose detail page hasn't been written
 * yet. Every project needs a route — the build asserts it (see verifySlugs) —
 * so a card can ship before its page has anything to say, and this is what
 * fills the gap honestly rather than leaving a bare header.
 *
 * Both buttons are exits on purpose: someone who followed a card here wanted
 * detail, and the two useful answers are "look at the others" or "just ask
 * me". Replace the whole component with real content when there is some.
 */
export const ProjectPageInProgress = () => {
  return (
    <section className='border-border bg-card mx-auto flex max-w-xl flex-col items-center gap-6 rounded-xl border p-8 text-center sm:p-10'>
      <p className='text-muted-foreground text-base leading-relaxed'>
        Whoops, still working on this page! Come back later or contact me to get
        more details.
      </p>

      {/* Stacked on narrow screens so neither button gets squeezed to two
          lines of text. */}
      <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row'>
        <Button asChild variant='outline'>
          <Link href={PROJECTS_BASE_PATH}>
            <ArrowLeft aria-hidden />
            Back to projects
          </Link>
        </Button>

        <Button asChild>
          <Link href='/contact'>
            <Mail aria-hidden />
            Contact me
          </Link>
        </Button>
      </div>
    </section>
  );
};
