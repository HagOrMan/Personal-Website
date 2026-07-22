'use client';

import { VideoExperience } from '@/components/video/VideoExperience';
import { VideoId } from '@/constant/transcripts';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

export type VideoStickyShellProps = {
  videos: PortfolioVideo[];
  activeVideoId?: VideoId;
  onActiveVideoChange?: (id: VideoId) => void;
};

/**
 * The right-hand lane on desktop about-me: a sticky panel so the player +
 * playlist stay visible the whole way down the page while the left column
 * (page content) scrolls underneath. Purely a positioning wrapper - all
 * player/ToC behavior lives in VideoExperience.
 */
export function VideoStickyShell({
  videos,
  activeVideoId,
  onActiveVideoChange,
}: VideoStickyShellProps) {
  return (
    <div className='lg:sticky lg:top-24 lg:h-fit'>
      <VideoExperience
        videos={videos}
        variant='sticky'
        activeVideoId={activeVideoId}
        onActiveVideoChange={onActiveVideoChange}
      />
    </div>
  );
}
