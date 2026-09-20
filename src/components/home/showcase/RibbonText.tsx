import type { ReactNode } from 'react';

/**
 * The small line above a row's title — dates and kind on an experience, the
 * year on a project. Takes the row's accent through --row-accent, which
 * RibbonRow sets on the text half, so it's the same colour as the glow
 * behind the media opposite it.
 */
export function RibbonEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      style={{ color: 'var(--row-accent)' }}
      className='tracking-eyebrow text-xs font-semibold uppercase'
    >
      {children}
    </p>
  );
}

/** A row's one paragraph. Never clamped — every row is a full column wide. */
export function RibbonProse({ children }: { children: ReactNode }) {
  return (
    <p className='text-muted-foreground max-w-prose leading-relaxed'>
      {children}
    </p>
  );
}
