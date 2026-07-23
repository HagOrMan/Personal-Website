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
    // mx-auto + a max-width centers the card within whatever space its
    // parent grid column leaves - the column itself is no longer sized to
    // exactly fit the card (see AboutMeClient), so this keeps it from
    // hugging the right edge of the page on wide viewports.
    //
    // 480px, not a rounder-looking 440px: the sticky card's internal grid
    // (frame + "Up next") has two non-shrinking floors - the 13rem frame
    // column and the ToC's min-w-[200px] - plus a 1rem gap and the card's
    // own border/padding, which floors the card itself at ~466px. Going
    // narrower than that reintroduces the row overflowing the card (a
    // phantom x-scrollbar, hidden until hover by .scrollbar-hover).
    <div className='mx-auto w-full max-w-[480px] lg:sticky lg:top-10 lg:h-fit'>
      <VideoExperience
        videos={videos}
        variant='sticky'
        activeVideoId={activeVideoId}
        onActiveVideoChange={onActiveVideoChange}
        playSignal={playSignal}
      />
    </div>
  );
}
