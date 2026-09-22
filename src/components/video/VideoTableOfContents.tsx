'use client';

import { VideoId } from '@/constant/transcripts';
import { cn } from '@/lib/utils';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

type VideoTableOfContentsProps = {
  videos: PortfolioVideo[];
  currentId: VideoId;
  onSelect: (id: VideoId) => void;
  /** 'list' = roomier padding (modal), 'playlist' = tighter padding (sticky panel). Long titles wrap in both. */
  density?: 'list' | 'playlist';
  className?: string;
};

export function VideoTableOfContents({
  videos,
  currentId,
  onSelect,
  density = 'list',
  className,
}: VideoTableOfContentsProps) {
  return (
    <ol className={cn('flex flex-col gap-1', className)}>
      {videos.map((video, index) => {
        const isCurrent = video.id === currentId;
        return (
          <li key={video.id}>
            <button
              type='button'
              onClick={() => onSelect(video.id)}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'focus-visible:ring-ring flex w-full cursor-pointer items-center gap-3 rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
                density === 'list' ? 'p-3' : 'px-2.5 py-2',
                isCurrent
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'text-foreground/75 hover:bg-accent hover:text-foreground',
              )}
            >
              <span className='text-muted-foreground shrink-0 text-sm tabular-nums'>
                {index + 1}
              </span>
              <span className='min-w-0 flex-1 text-sm break-words'>
                {video.title}
              </span>
              <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                {video.durationLabel}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
