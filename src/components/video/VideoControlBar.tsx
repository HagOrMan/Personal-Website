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

type VideoControlBarProps = {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  transcriptOpen: boolean;
  transcriptPanelId: string;
  videoTitle: string;
  hasPrev: boolean;
  hasNext: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onToggleTranscript: () => void;
  onPrev: () => void;
  onNext: () => void;
};

const iconButtonClasses =
  'focus-visible:ring-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-30';

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
      <div className='flex items-center gap-1'>
        <button
          type='button'
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label='Previous video'
          className={iconButtonClasses}
        >
          <ChevronLeft className='size-5' />
        </button>

        <button
          type='button'
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={iconButtonClasses}
        >
          {isPlaying ? (
            <Pause className='size-5' fill='currentColor' />
          ) : (
            <Play className='size-5' fill='currentColor' />
          )}
        </button>

        <button
          type='button'
          onClick={onNext}
          disabled={!hasNext}
          aria-label='Next video'
          className={iconButtonClasses}
        >
          <ChevronRight className='size-5' />
        </button>

        <button
          type='button'
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className={cn(iconButtonClasses, 'ml-auto')}
        >
          {isMuted ? (
            <VolumeX className='size-5' />
          ) : (
            <Volume2 className='size-5' />
          )}
        </button>

        <button
          type='button'
          onClick={onToggleTranscript}
          aria-expanded={transcriptOpen}
          aria-controls={transcriptPanelId}
          aria-label={transcriptOpen ? 'Hide transcript' : 'Show transcript'}
          className={cn(
            iconButtonClasses,
            transcriptOpen && 'bg-accent text-foreground',
          )}
        >
          <FileText className='size-5' />
        </button>
      </div>

      {/* Seek bar on its own row - sharing the row above with the
          prev/play/next/mute/transcript buttons overflowed narrower cards
          (e.g. the about-me sticky panel). */}
      <div className='flex items-center gap-2 px-1'>
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
    </div>
  );
}
