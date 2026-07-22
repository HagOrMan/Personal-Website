'use client';

import Image from 'next/image';

import { RotateCcw, SkipBack } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

type VideoEndCardProps = {
  finishedVideoTitle: string;
  nextVideo: PortfolioVideo | null;
  showBackToStart: boolean;
  onAdvance: () => void;
  onReplay: () => void;
  onBackToStart: () => void;
};

export function VideoEndCard({
  finishedVideoTitle,
  nextVideo,
  showBackToStart,
  onAdvance,
  onReplay,
  onBackToStart,
}: VideoEndCardProps) {
  return (
    <div
      // Swallow clicks so a stray tap on the scrim doesn't bubble up to the
      // frame's click-to-toggle-play handler underneath.
      onClick={(event) => event.stopPropagation()}
      className='absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-black/85 via-black/60 to-black/30 p-4 text-center'
    >
      {nextVideo && (
        <button
          type='button'
          onClick={onAdvance}
          className='focus-visible:ring-ring group flex w-full max-w-[220px] cursor-pointer flex-col items-center gap-2 rounded-2xl p-2 text-white transition-transform focus-visible:ring-2 focus-visible:outline-hidden active:scale-95'
        >
          <span className='relative aspect-[9/16] w-28 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20'>
            <Image
              src={nextVideo.poster}
              alt=''
              fill
              sizes='112px'
              className='object-cover'
            />
          </span>
          <span className='text-xs tracking-wide text-white/70 uppercase'>
            Up next
          </span>
          <span className='group-hover:text-lush-300 text-base font-semibold transition-colors'>
            {nextVideo.title}
          </span>
          <span className='text-sm text-white/70 tabular-nums'>
            {nextVideo.durationLabel}
          </span>
        </button>
      )}

      <div
        className={cn(
          'flex w-full max-w-[220px] flex-col items-stretch gap-2',
          nextVideo ? 'text-white/80' : 'text-white',
        )}
      >
        <button
          type='button'
          onClick={onReplay}
          className='focus-visible:ring-ring inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-hidden active:scale-95'
        >
          <RotateCcw className='size-4' />
          Replay &ldquo;{finishedVideoTitle}&rdquo;
        </button>

        {showBackToStart && (
          <button
            type='button'
            onClick={onBackToStart}
            className='focus-visible:ring-ring inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-hidden active:scale-95'
          >
            <SkipBack className='size-4' />
            Back to start
          </button>
        )}
      </div>
    </div>
  );
}
