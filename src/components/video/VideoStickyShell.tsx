'use client';

import { VideoExperience } from '@/components/video/VideoExperience';
import { VideoId } from '@/constant/transcripts';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

export type VideoStickyShellProps = {
  videos: PortfolioVideo[];
  activeVideoId?: VideoId;
  onActiveVideoChange?: (id: VideoId) => void;
  /** Bump to force playback to start now, even if activeVideoId is already the target (e.g. a "Watch" chip for the currently-selected video). */
  playSignal?: number;
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
  playSignal,
}: VideoStickyShellProps) {
  return (
    // @container makes this lane the size container the frame's cqw ceiling
    // resolves against, which is what keeps the card inside the lane (see
    // frameSizeClass in VideoExperience). It also means the lane's width
    // never depends on the card, so AboutMeClient's 2fr/3fr split holds.
    // The card hugs its content and is centered in the lane via mx-auto.
    <div className='@container w-full lg:sticky lg:top-10 lg:h-fit'>
      <VideoExperience
        videos={videos}
        variant='sticky'
        activeVideoId={activeVideoId}
        onActiveVideoChange={onActiveVideoChange}
        playSignal={playSignal}
        className='mx-auto'
      />
    </div>
  );
}
