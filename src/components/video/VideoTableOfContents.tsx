'use client';

import { VideoId } from '@/constant/transcripts';
import { cn } from '@/lib/utils';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

type VideoTableOfContentsProps = {
  videos: PortfolioVideo[];
  currentId: VideoId;
  onSelect: (id: VideoId) => void;
  /** 'list' = roomier (modal), 'playlist' = compact (sticky panel). */
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
                'focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
                density === 'list' ? 'p-3' : 'px-2.5 py-2',
                isCurrent
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'text-foreground/75 hover:bg-accent hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'text-muted-foreground shrink-0 tabular-nums',
                  density === 'list' ? 'text-sm' : 'text-xs',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'flex-1 truncate',
                  density === 'list' ? 'text-sm' : 'text-xs',
                )}
              >
                {video.title}
              </span>
              <span
                className={cn(
                  'text-muted-foreground shrink-0 tabular-nums',
                  density === 'list' ? 'text-xs' : 'text-[0.7rem]',
                )}
              >
                {video.durationLabel}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
