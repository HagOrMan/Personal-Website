'use client';

import { Pause, Play } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The shared look for every icon button in a video surface. Exported because
 * the control bar builds its other buttons (prev/next/mute/transcript) from
 * the same base.
 */
export const videoIconButtonClasses =
  'focus-visible:ring-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/80 transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:outline-hidden active:scale-95 disabled:pointer-events-none disabled:opacity-30';

type PlayPauseButtonProps = {
  isPlaying: boolean;
  onToggle: () => void;
  /**
   * Overrides the bare "Play"/"Pause" label. Worth setting anywhere the button
   * appears more than once on a page — "Play the MonPoke preview" beats six
   * buttons all called "Play".
   */
  label?: { play: string; pause: string };
  className?: string;
  iconClassName?: string;
};

/**
 * The one play/pause control on the site — the video series' control bar and
 * the project cards' preview loops render the same button.
 */
export function PlayPauseButton({
  isPlaying,
  onToggle,
  label,
  className,
  iconClassName = 'size-5',
}: PlayPauseButtonProps) {
  const accessibleName = isPlaying
    ? (label?.pause ?? 'Pause')
    : (label?.play ?? 'Play');

  return (
    <button
      type='button'
      onClick={onToggle}
      aria-label={accessibleName}
      className={cn(videoIconButtonClasses, className)}
    >
      {isPlaying ? (
        <Pause className={iconClassName} fill='currentColor' />
      ) : (
        <Play className={iconClassName} fill='currentColor' />
      )}
    </button>
  );
}
