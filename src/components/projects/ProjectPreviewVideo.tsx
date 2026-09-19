'use client';

import * as React from 'react';

import { PlayPauseButton } from '@/components/video/PlayPauseButton';
import {
  useIsOnScreen,
  useMediaQuery,
  usePrefersReducedMotion,
} from '@/lib/screenUtils';
import { cn } from '@/lib/utils';

/** Sustained hover before we spend a request. A cursor crossing the grid on
 * its way somewhere else shouldn't pull down six videos. */
const HOVER_INTENT_MS = 120;

/**
 * The one loop allowed to run at a time, held as the callback that stops it.
 *
 * Module-level rather than a context because the cards share no parent that
 * knows anything about playback, and there's only ever one grid of them on a
 * page. On desktop it rarely fires — you can only hover one card — but it's
 * what stops tapped videos piling up on mobile, where every play is a
 * deliberate button press with nothing to end it, and it also covers a card
 * holding keyboard focus while a different one is hovered.
 */
let stopActiveLoop: (() => void) | null = null;

function claimPlayback(stop: () => void) {
  if (stopActiveLoop && stopActiveLoop !== stop) stopActiveLoop();
  stopActiveLoop = stop;
}

function releasePlayback(stop: () => void) {
  if (stopActiveLoop === stop) stopActiveLoop = null;
}

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
 * The 4-6s loop behind a project card's thumbnail. Silent, looping, and never
 * autoplayed on scroll — it only runs on deliberate hover, focus, or a tap of
 * the play button, one at a time across the page, and it stops as soon as it
 * leaves the viewport.
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

  // No rootMargin: "scrolled out of view" should mean actually out of view,
  // not 128px past it. The hook folds in tab visibility too, so switching
  // away from the tab pauses as well.
  const onScreen = useIsOnScreen(videoRef, '0px');

  // setWantsPlay is stable, so this identity is stable across renders — which
  // is what lets the registry above recognise its own entry.
  const stop = React.useCallback(() => setWantsPlay(false), []);

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

  // Scrolling a playing card away stops it. On mobile that's the only thing
  // that ever will — a tap has no equivalent of a mouse leaving.
  React.useEffect(() => {
    if (!onScreen) stop();
  }, [onScreen, stop]);

  // Take or give up the single playback slot. Claiming it stops whoever had
  // it, which is the whole mechanism.
  React.useEffect(() => {
    if (wantsPlay) {
      claimPlayback(stop);
    } else {
      releasePlayback(stop);
    }
  }, [wantsPlay, stop]);

  // Unmounting while holding the slot would leave a dead callback in it, and
  // the next card to play would call into a component that no longer exists.
  React.useEffect(() => () => releasePlayback(stop), [stop]);

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
