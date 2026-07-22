'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import Image from 'next/image';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { motion } from 'motion/react';

import { useVideoExperience } from '@/components/video/hooks/useVideoExperience';
import {
  VideoActionBar,
  VideoControlBar,
  VideoSeekBar,
} from '@/components/video/VideoControlBar';
import { VideoEndCard } from '@/components/video/VideoEndCard';
import { VideoTableOfContents } from '@/components/video/VideoTableOfContents';
import { VideoTranscriptPanel } from '@/components/video/VideoTranscriptPanel';
import { VideoId } from '@/constant/transcripts';
import { useMediaQuery, usePrefersReducedMotion } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

// Mobile modal's slide-in contents drawer - fixed px width (not a vw
// fraction) so the toggle tab's animated `left` tracks it exactly.
const TOC_DRAWER_WIDTH = 220;

export type VideoExperienceProps = {
  videos: PortfolioVideo[];
  variant: 'modal' | 'sticky';
  /** Renders the top-right close (X) button when provided - modal only. */
  onClose?: () => void;
  /** Controlled current video id, e.g. driven by a "Watch" chip elsewhere on the page. Uncontrolled if omitted. */
  activeVideoId?: VideoId;
  onActiveVideoChange?: (id: VideoId) => void;
  /** Which video to start on when uncontrolled (e.g. a mobile "Watch" chip opening the modal to a specific clip). */
  initialVideoId?: VideoId;
  /** Autoplay as soon as this mounts - only appropriate right after the deliberate click that opens the modal. */
  autoplayOnMount?: boolean;
  /** Bump to force playback to start now, even if activeVideoId is already the target (e.g. a "Watch" chip for the currently-selected video). */
  playSignal?: number;
  className?: string;
};

/**
 * The single reusable video player: owns playback state, controls, the end
 * card, the transcript disclosure, and the table of contents. Rendered by
 * VideoModalShell (variant="modal") and VideoStickyShell (variant="sticky") -
 * those shells only differ in framing/positioning, never in player logic.
 */
export function VideoExperience({
  videos,
  variant,
  onClose,
  activeVideoId,
  onActiveVideoChange,
  initialVideoId,
  autoplayOnMount = false,
  playSignal,
  className,
}: VideoExperienceProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Below this, the desktop modal relocates the action bar (play/prev/next/
  // mute/transcript-toggle) into the Contents column instead of the left
  // column - reclaiming vertical room in a short window without changing
  // anything about the roomier layout above the threshold. The transcript
  // itself always spans the full width below both columns regardless of
  // this threshold - see the isDesktop return below.
  const isShort = useMediaQuery('(max-height: 500px)');
  const prefersReducedMotion = usePrefersReducedMotion();
  const transcriptPanelId = useId();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Only the sticky shell (desktop about-me) has page sections to scroll to;
  // the modal has no underlying page content behind it.
  const handleNavigate = useCallback(
    (video: PortfolioVideo) => {
      if (variant !== 'sticky' || !video.relatedSectionId) return;
      document.getElementById(video.relatedSectionId)?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    },
    [variant, prefersReducedMotion],
  );

  const state = useVideoExperience({
    videos,
    activeVideoId,
    onActiveVideoChange,
    initialVideoId,
    onNavigate: handleNavigate,
    autoplayOnMount,
    playSignal,
  });

  const { currentVideo, nextVideo, currentIndex, hasPrevVideo, actions } =
    state;
  const showPosterOverlay =
    !state.isPlaying && !state.ended && state.currentTime < 0.15;

  // The desktop modal's scroll container doesn't reveal newly-opened content
  // on its own - without this, opening the transcript while the modal is
  // already scrolled to fit the viewport just adds height below the fold
  // instead of bringing the panel into view. Delayed briefly so we scroll to
  // the transcript's fully-expanded position rather than where the
  // Collapsible's open animation starts (see --animate-collapsible-down).
  useEffect(() => {
    if (!isDesktop || !state.transcriptOpen) return;
    const delay = prefersReducedMotion ? 0 : 220;
    const timer = window.setTimeout(() => {
      transcriptRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isDesktop, state.transcriptOpen, prefersReducedMotion]);

  // The desktop modal has no ancestor with a definite height (unlike the
  // mobile modal's h-full flex column), so a percentage max-height (100%)
  // can't resolve there. A viewport-relative clamp works regardless of that:
  // shrink the video as the window gets shorter,
  // down to a 400px floor (roughly a 225px-wide clip - still legible),
  // below which shrinking further would hurt more than it helps and the
  // panel's own scroll wrapper should take over instead. 240px approximates
  // the title + two-row controls + gaps + panel padding around it with the
  // transcript closed; opening the transcript eats into that budget, which
  // is exactly when the scroll fallback should kick in.
  //
  // Below the isShort threshold, the action bar and transcript both move
  // out of the left column (see the isDesktop return below), so the
  // left column only has to fit the title + seek bar - roughly 130px of
  // chrome instead of 240px, letting the video claim the rest.
  const frameMaxHeightClass =
    variant === 'modal' && isDesktop
      ? isShort
        ? 'max-h-[clamp(400px,calc(100vh_-_130px),640px)] self-center'
        : 'max-h-[clamp(400px,calc(100vh_-_240px),640px)] self-center'
      : 'max-h-full';

  const frame = (
    <div
      // No definite width on purpose: letting it stay auto (only capped by
      // max-w) lets the browser solve the 9:16 box against whichever axis is
      // tighter. A forced w-full here would win a conflict with max-h by
      // keeping width fixed and clipping height instead - that's what was
      // cropping/oversizing the video in the mobile modal. In the desktop
      // modal, the frame is a flex item of a flex-col column whose default
      // align-items: stretch would force width back to the column's full
      // 320px regardless of the height clamp above - self-center (bundled
      // into frameMaxHeightClass for the desktop-modal case) opts out of
      // that stretch so width can shrink along with the clamped height.
      className={cn(
        'group relative aspect-[9/16] max-w-full cursor-pointer overflow-hidden rounded-2xl bg-black',
        frameMaxHeightClass,
      )}
      onClick={actions.togglePlay}
    >
      <video
        key={currentVideo.id}
        ref={state.bindVideoRef}
        src={currentVideo.src}
        preload='none'
        playsInline
        aria-label={currentVideo.title}
        className='h-full w-full object-cover'
        {...state.videoElementProps}
      />

      {showPosterOverlay && (
        <Image
          src={currentVideo.poster}
          alt=''
          fill
          priority={currentIndex === 0}
          sizes='(min-width: 1024px) 360px, 100vw'
          className='pointer-events-none object-cover'
        />
      )}

      {!state.isPlaying && !state.ended && (
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <span className='flex size-16 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors group-hover:bg-black/55'>
            <Play className='size-7 translate-x-0.5' fill='currentColor' />
          </span>
        </div>
      )}

      {state.ended && (
        <VideoEndCard
          finishedVideoTitle={currentVideo.title}
          nextVideo={nextVideo}
          showBackToStart={!nextVideo && currentIndex !== 0}
          onAdvance={actions.next}
          onReplay={actions.replay}
          onBackToStart={actions.restart}
        />
      )}

      {state.preloadNext && nextVideo && (
        <video
          key={`preload-${nextVideo.id}`}
          src={nextVideo.src}
          preload='auto'
          muted
          playsInline
          aria-hidden
          className='hidden'
        />
      )}
    </div>
  );

  const titleClassName =
    'text-foreground truncate text-xl font-semibold sm:text-2xl';
  // Modal variant renders inside a Radix Dialog, so the visible title doubles
  // as the Dialog's accessible name via DialogPrimitive.Title (rather than a
  // hidden duplicate) - the sticky variant has no Dialog context to hook into.
  const title =
    variant === 'modal' ? (
      <DialogPrimitive.Title className={titleClassName}>
        {currentVideo.title}
      </DialogPrimitive.Title>
    ) : (
      <h2 className={titleClassName}>{currentVideo.title}</h2>
    );

  const controls = (
    <VideoControlBar
      isPlaying={state.isPlaying}
      isMuted={state.isMuted}
      currentTime={state.currentTime}
      duration={state.duration}
      transcriptOpen={state.transcriptOpen}
      transcriptPanelId={transcriptPanelId}
      videoTitle={currentVideo.title}
      hasPrev={hasPrevVideo}
      hasNext={Boolean(nextVideo)}
      onTogglePlay={actions.togglePlay}
      onSeek={actions.seek}
      onToggleMute={actions.toggleMute}
      onToggleTranscript={actions.toggleTranscript}
      onPrev={actions.prev}
      onNext={actions.next}
    />
  );

  // Split apart from `controls` above only for the desktop-modal isShort
  // layout, which relocates the action bar into the Contents column while
  // leaving the seek bar under the video.
  const seekBar = (
    <VideoSeekBar
      currentTime={state.currentTime}
      duration={state.duration}
      videoTitle={currentVideo.title}
      onSeek={actions.seek}
    />
  );

  const actionBar = (
    <VideoActionBar
      isPlaying={state.isPlaying}
      isMuted={state.isMuted}
      transcriptOpen={state.transcriptOpen}
      transcriptPanelId={transcriptPanelId}
      hasPrev={hasPrevVideo}
      hasNext={Boolean(nextVideo)}
      onTogglePlay={actions.togglePlay}
      onToggleMute={actions.toggleMute}
      onToggleTranscript={actions.toggleTranscript}
      onPrev={actions.prev}
      onNext={actions.next}
      density='compact'
    />
  );

  const transcript = (
    <VideoTranscriptPanel
      open={state.transcriptOpen}
      transcript={currentVideo.transcript}
      videoTitle={currentVideo.title}
      panelId={transcriptPanelId}
    />
  );

  const closeButton = onClose && (
    <button
      type='button'
      onClick={onClose}
      aria-label='Close video experience'
      className='focus-visible:ring-ring absolute top-4 right-4 z-50 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-background/80 text-foreground/80 backdrop-blur-sm transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:outline-hidden active:scale-95'
    >
      <X className='size-5' />
    </button>
  );

  if (variant === 'sticky') {
    return (
      <div
        className={cn(
          // border/50 (rather than the full-strength border color) keeps
          // this readable as a card edge without the harsh outline it had
          // in light mode, where --border sits far lighter than --card.
          'bg-card border-border/50 flex w-full flex-col gap-4 rounded-2xl border p-4 sm:p-5',
          className,
        )}
      >
        {title}
        <div className='mx-auto w-full max-w-[280px]'>{frame}</div>
        {controls}
        {transcript}
        <div className='border-border/70 flex flex-col gap-2 border-t pt-3'>
          <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
            Up next
          </h3>
          <VideoTableOfContents
            videos={videos}
            currentId={currentVideo.id}
            onSelect={actions.goToId}
            density='playlist'
            className='scrollbar-hover max-h-56 overflow-y-auto'
          />
        </div>
      </div>
    );
  }

  // variant === 'modal', desktop: ToC fully visible alongside the frame,
  // inside one opaque rounded container. Below isShort, the action bar
  // moves into this column (under Contents). The transcript always spans
  // below both columns instead of living in the 320px left column - so
  // opening it can't be constrained by (or, via a long unwrapped line,
  // stretch) whichever column the toggle button currently lives in.
  if (isDesktop) {
    return (
      <div
        className={cn(
          'bg-background relative flex max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-8',
          className,
        )}
      >
        {closeButton}
        {/* The close button stays outside this scroll region (pinned to the
            panel corner) - everything else scrolls together on short
            viewports instead of being hard-clipped top and bottom. One
            scroll region only (not a second, independently-scrolling one
            for Contents) - two nested scrollbars fighting over the mouse
            wheel is worse than the rare case of scrolling the whole thing. */}
        <div className='scrollbar-hover flex max-h-[85vh] w-full flex-col overflow-y-auto'>
          <div className='flex w-full gap-8'>
            <div className='flex w-80 flex-col gap-4'>
              {title}
              {frame}
              {isShort ? seekBar : controls}
            </div>
            <div
              className={cn(
                'border-border/70 flex flex-col gap-2 border-l pl-6',
                isShort ? 'w-64' : 'w-56',
              )}
            >
              <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                Contents
              </h3>
              <VideoTableOfContents
                videos={videos}
                currentId={currentVideo.id}
                onSelect={actions.goToId}
                density='list'
                className='scrollbar-hover overflow-y-auto'
              />
              {isShort && (
                <div className='border-border/70 mt-2 flex flex-col gap-2 border-t pt-3'>
                  <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                    Playback
                  </h3>
                  {actionBar}
                </div>
              )}
            </div>
          </div>

          {/* min-w-0 stops this flex-col item from growing past the row
              above (and taking the whole modal with it) if the transcript
              text has a long unbroken line - see also break-words on the
              transcript's own text container. */}
          <div
            ref={transcriptRef}
            className={cn('min-w-0', state.transcriptOpen && 'mt-4')}
          >
            {transcript}
          </div>
        </div>
      </div>
    );
  }

  // variant === 'modal', mobile: near-fullscreen with a slide-in ToC drawer.
  return (
    <div
      className={cn(
        'bg-background relative flex h-full w-full flex-col gap-4 overflow-hidden p-4',
        className,
      )}
    >
      {closeButton}
      <div className='pr-12'>{title}</div>

      <div className='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl'>
        {frame}

        <motion.div
          className='absolute inset-y-0 left-0 z-40 overflow-hidden'
          initial={false}
          animate={{ width: state.tocOpen ? TOC_DRAWER_WIDTH : 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div
            className='h-full w-[220px] max-w-[80vw] shrink-0 rounded-r-2xl border-r bg-background/95 p-4 shadow-xl backdrop-blur-sm'
            inert={!state.tocOpen}
            aria-hidden={!state.tocOpen}
          >
            <h3 className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
              Contents
            </h3>
            <VideoTableOfContents
              videos={videos}
              currentId={currentVideo.id}
              onSelect={(id) => {
                actions.goToId(id);
                actions.closeToc();
              }}
              density='list'
              className='scrollbar-hover overflow-y-auto'
            />
          </div>
        </motion.div>

        <motion.button
          type='button'
          onClick={actions.toggleToc}
          aria-label={state.tocOpen ? 'Hide contents' : 'Show contents'}
          aria-expanded={state.tocOpen}
          initial={false}
          animate={{ left: state.tocOpen ? TOC_DRAWER_WIDTH : 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          className='focus-visible:ring-ring absolute top-1/2 z-40 flex h-14 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 bg-background shadow transition-transform focus-visible:ring-2 focus-visible:outline-hidden active:scale-95'
        >
          {state.tocOpen ? (
            <ChevronLeft className='size-4' />
          ) : (
            <ChevronRight className='size-4' />
          )}
        </motion.button>
      </div>

      {controls}
      {transcript}
    </div>
  );
}
