'use client';

import { useCallback, useId } from 'react';
import Image from 'next/image';

import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { motion } from 'motion/react';

import { useVideoExperience } from '@/components/video/hooks/useVideoExperience';
import { VideoControlBar } from '@/components/video/VideoControlBar';
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
  /** Id for the visible title element, so a wrapping Dialog can point aria-labelledby at it. */
  titleId?: string;
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
  titleId: titleIdProp,
  className,
}: VideoExperienceProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const prefersReducedMotion = usePrefersReducedMotion();
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const transcriptPanelId = useId();

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
  });

  const { currentVideo, nextVideo, currentIndex, hasPrevVideo, actions } =
    state;
  const showPosterOverlay =
    !state.isPlaying && !state.ended && state.currentTime < 0.15;

  const frame = (
    <div
      className='relative aspect-[9/16] max-h-full w-full shrink-0 overflow-hidden rounded-2xl bg-black'
      onClick={actions.togglePlay}
    >
      <video
        key={currentVideo.id}
        ref={state.videoRef}
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
          <span className='flex size-16 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm'>
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

  const title = (
    <h2
      id={titleId}
      className='text-foreground truncate text-xl font-semibold sm:text-2xl'
    >
      {currentVideo.title}
    </h2>
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
      className='focus-visible:ring-ring absolute top-4 right-4 z-50 inline-flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground/80 backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:outline-hidden'
    >
      <X className='size-5' />
    </button>
  );

  if (variant === 'sticky') {
    return (
      <div
        className={cn(
          'bg-card flex w-full flex-col gap-4 rounded-2xl border p-4 sm:p-5',
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
            className='max-h-56 overflow-y-auto'
          />
        </div>
      </div>
    );
  }

  // variant === 'modal', desktop: ToC fully visible alongside the frame,
  // inside one opaque rounded container.
  if (isDesktop) {
    return (
      <div
        className={cn(
          'bg-background relative flex max-w-3xl gap-8 rounded-3xl p-6 shadow-2xl sm:p-8',
          className,
        )}
      >
        {closeButton}
        <div className='flex w-80 flex-col gap-4'>
          {title}
          {frame}
          {controls}
          {transcript}
        </div>
        <div className='border-border/70 flex w-56 flex-col gap-2 border-l pl-6'>
          <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
            Contents
          </h3>
          <VideoTableOfContents
            videos={videos}
            currentId={currentVideo.id}
            onSelect={actions.goToId}
            density='list'
            className='overflow-y-auto'
          />
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

      <div className='relative min-h-0 flex-1 overflow-hidden rounded-2xl'>
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
              className='overflow-y-auto'
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
          className='focus-visible:ring-ring absolute top-1/2 z-40 flex h-14 w-6 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 bg-background shadow focus-visible:ring-2 focus-visible:outline-hidden'
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
