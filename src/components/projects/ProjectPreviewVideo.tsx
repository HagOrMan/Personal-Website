'use client';

import * as React from 'react';

import { PlayPauseButton } from '@/components/video/PlayPauseButton';
import { useMediaQuery, usePrefersReducedMotion } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';

/** Sustained hover before we spend a request. A cursor crossing the grid on
 * its way somewhere else shouldn't pull down six videos. */
const HOVER_INTENT_MS = 120;

type ProjectPreviewVideoProps = {
  src: string;
  /** Doubles as the <video> poster, so the first frame isn't a black box. */
  poster?: string;
  /** Project name — gives the play button an accessible name worth reading. */
  title: string;
  /** True while the card is hovered or holds keyboard focus. */
  active: boolean;
  className?: string;
};

/**
 * The 4–6s loop behind a project card's thumbnail. Silent, looping, and never
 * autoplayed on scroll — it only runs on deliberate hover, focus, or a tap of
 * the play button.
 */
export function ProjectPreviewVideo({
  src,
  poster,
  title,
  active,
  className,
}: ProjectPreviewVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  // Split from `wantsPlay` so the <video> stays src-less (and silent on the
  // network, preload="none" notwithstanding) until something asks for it.
  const [armed, setArmed] = React.useState(false);
  const [wantsPlay, setWantsPlay] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  // Touch devices have no hover to intend with, and reduced motion means the
  // loop has to be asked for rather than sprung on you. Both get the button.
  const autoPlaysOnHover = canHover && !prefersReducedMotion;

  React.useEffect(() => {
    if (!autoPlaysOnHover) return;

    if (!active) {
      setWantsPlay(false);
      return;
    }

    const timer = setTimeout(() => {
      setArmed(true);
      setWantsPlay(true);
    }, HOVER_INTENT_MS);

    return () => clearTimeout(timer);
  }, [active, autoPlaysOnHover]);

  React.useEffect(() => {
    const video = videoRef.current;
    // Nothing has asked for the loop yet, so there's nothing to drive.
    if (!video || !armed) return;

    if (wantsPlay) {
      // Rejects on autoplay policies and on a src that never loaded; either
      // way the poster stays up, which is a fine outcome for a decoration.
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
    // Back to frame 0 so the next hover starts the loop from the top.
    video.currentTime = 0;
  }, [wantsPlay, armed]);

  const toggle = () => {
    setArmed(true);
    setWantsPlay((playing) => !playing);
  };

  return (
    <>
      <video
        ref={videoRef}
        src={armed ? src : undefined}
        poster={poster}
        muted
        playsInline
        loop
        preload='none'
        aria-hidden
        tabIndex={-1}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className={cn(
          // Contain, not cover: a recording that isn't exactly 16:9 gets
          // letterboxed against the slot's bg-muted rather than cropped, so
          // whatever the loop was framed around survives. Must match the
          // poster's object-fit exactly — the two are stacked and crossfaded,
          // and a mismatch shows up as the image jumping when playback starts.
          'absolute inset-0 size-full object-contain object-center',
          'motion-safe:transition-opacity motion-safe:duration-300',
          isPlaying ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />

      {!autoPlaysOnHover && (
        // z-[1] lifts it over the card's stretched link, so this button plays
        // the loop while a tap anywhere else still opens the project.
        <PlayPauseButton
          isPlaying={isPlaying}
          onToggle={toggle}
          label={{
            play: `Play the ${title} preview`,
            pause: `Pause the ${title} preview`,
          }}
          className='bg-background/80 absolute right-2 bottom-2 z-[1] size-9 backdrop-blur-sm'
          iconClassName='size-4'
        />
      )}
    </>
  );
}
