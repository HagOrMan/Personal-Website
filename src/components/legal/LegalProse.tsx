import type { ReactNode } from 'react';

/**
 * Shared shell for /privacy and /terms, so the two can't drift apart.
 *
 * Borrows the blog's 72ch reading measure but not its typeface: the serif is
 * deliberately the blog's own thing (guides/style-guide.md), and these pages
 * are site furniture rather than prose anyone came here to read.
 */
export function LegalProse({ children }: { children: ReactNode }) {
  return (
    <div className='mx-auto flex w-full max-w-[72ch] flex-col gap-8'>
      {children}
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-foreground text-xl font-semibold'>{heading}</h2>
      <div className='text-muted-foreground flex flex-col gap-3 leading-relaxed'>
        {children}
      </div>
    </section>
  );
}

/** Dated so a reader can tell at a glance whether this is still current. */
export function LegalUpdated({ date }: { date: string }) {
  return (
    <p className='text-muted-foreground/70 border-border border-t pt-6 text-sm'>
      Last updated {date}.
    </p>
  );
}
