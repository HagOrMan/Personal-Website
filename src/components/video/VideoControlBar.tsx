'use client';

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { cn, formatTime } from '@/lib/utils';

type VideoActionBarProps = {
  isPlaying: boolean;
  isMuted: boolean;
  transcriptOpen: boolean;
  transcriptPanelId: string;
  hasPrev: boolean;
  hasNext: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleTranscript: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** 'compact' trades button size for footprint - used when the action bar
   * is relocated into the narrower desktop-modal Contents column. */
  density?: 'default' | 'compact';
  className?: string;
};

type VideoSeekBarProps = {
  currentTime: number;
  duration: number;
  videoTitle: string;
  onSeek: (time: number) => void;
  className?: string;
};

type VideoControlBarProps = VideoActionBarProps & VideoSeekBarProps;

const iconButtonClasses =
  'focus-visible:ring-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/80 transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:outline-hidden active:scale-95 disabled:pointer-events-none disabled:opacity-30';

/**
 * Just the prev/play/next/mute/transcript-toggle row - split out from the
 * seek bar so the desktop modal can relocate this row into the Contents
 * column on short viewports while leaving the seek bar under the video
 * (see VideoExperience's isShort branch).
 */
export function VideoActionBar({
  isPlaying,
  isMuted,
  transcriptOpen,
  transcriptPanelId,
  hasPrev,
  hasNext,
  onTogglePlay,
  onToggleMute,
  onToggleTranscript,
  onPrev,
  onNext,
  density = 'default',
  className,
}: VideoActionBarProps) {
  const compact = density === 'compact';
  const buttonSizeClass = compact ? 'size-9' : 'size-11';
  const iconSizeClass = compact ? 'size-4' : 'size-5';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type='button'
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label='Previous video'
        className={cn(iconButtonClasses, buttonSizeClass)}
      >
        <ChevronLeft className={iconSizeClass} />
      </button>

      <button
        type='button'
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={cn(iconButtonClasses, buttonSizeClass)}
      >
        {isPlaying ? (
          <Pause className={iconSizeClass} fill='currentColor' />
        ) : (
          <Play className={iconSizeClass} fill='currentColor' />
        )}
      </button>

      <button
        type='button'
        onClick={onNext}
        disabled={!hasNext}
        aria-label='Next video'
        className={cn(iconButtonClasses, buttonSizeClass)}
      >
        <ChevronRight className={iconSizeClass} />
      </button>

      <button
        type='button'
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
        className={cn(iconButtonClasses, buttonSizeClass, 'ml-auto')}
      >
        {isMuted ? (
          <VolumeX className={iconSizeClass} />
        ) : (
          <Volume2 className={iconSizeClass} />
        )}
      </button>

      <button
        type='button'
        onClick={onToggleTranscript}
        aria-expanded={transcriptOpen}
        aria-controls={transcriptPanelId}
        aria-label={transcriptOpen ? 'Hide transcript' : 'Show transcript'}
        title={transcriptOpen ? 'Hide transcript' : 'Show transcript'}
        className={cn(
          iconButtonClasses,
          buttonSizeClass,
          transcriptOpen && 'bg-accent text-foreground',
        )}
      >
        <FileText className={iconSizeClass} />
      </button>
    </div>
  );
}

/** Just the scrubber row - see VideoActionBar above for why this is split out. */
export function VideoSeekBar({
  currentTime,
  duration,
  videoTitle,
  onSeek,
  className,
}: VideoSeekBarProps) {
  return (
    <div className={cn('flex items-center gap-2 px-1', className)}>
      <span className='text-muted-foreground min-w-9 text-xs tabular-nums'>
        {formatTime(currentTime)}
      </span>

      <input
        type='range'
        min={0}
        max={Math.max(duration, 0.01)}
        step={0.1}
        value={Math.min(currentTime, duration)}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label={`Seek — ${formatTime(currentTime)} of ${formatTime(duration)} through "${videoTitle}"`}
        className='accent-lush-500 focus-visible:outline-ring h-1.5 flex-1 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4'
      />

      <span className='text-muted-foreground min-w-9 text-xs tabular-nums'>
        {formatTime(duration)}
      </span>
    </div>
  );
}

/**
 * Roomy composition of VideoActionBar + VideoSeekBar stacked - used as-is
 * by the sticky panel and the mobile modal, which never split the two.
 */
export function VideoControlBar({
  isPlaying,
  isMuted,
  currentTime,
  duration,
  transcriptOpen,
  transcriptPanelId,
  videoTitle,
  hasPrev,
  hasNext,
  onTogglePlay,
  onSeek,
  onToggleMute,
  onToggleTranscript,
  onPrev,
  onNext,
}: VideoControlBarProps) {
  return (
    <div className='flex flex-col gap-1'>
      <VideoActionBar
        isPlaying={isPlaying}
        isMuted={isMuted}
        transcriptOpen={transcriptOpen}
        transcriptPanelId={transcriptPanelId}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onTogglePlay={onTogglePlay}
        onToggleMute={onToggleMute}
        onToggleTranscript={onToggleTranscript}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* Seek bar on its own row - sharing the row above with the
          prev/play/next/mute/transcript buttons overflowed narrower cards
          (e.g. the about-me sticky panel). */}
      <VideoSeekBar
        currentTime={currentTime}
        duration={duration}
        videoTitle={videoTitle}
        onSeek={onSeek}
      />
    </div>
  );
}
