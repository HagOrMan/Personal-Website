'use client';

import {
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { VideoId } from '@/constant/transcripts';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

export type UseVideoExperienceOptions = {
  videos: PortfolioVideo[];
  /** Controlled current video id (e.g. a "Watch" chip elsewhere on the page). Uncontrolled if omitted. */
  activeVideoId?: VideoId;
  onActiveVideoChange?: (id: VideoId) => void;
  /** Called only for in-player navigation (ToC, next/prev, end card) - not for externally controlled changes. */
  onNavigate?: (video: PortfolioVideo) => void;
  /** Autoplay the current video as soon as this hook mounts. Only appropriate right after a deliberate open click (the modal). */
  autoplayOnMount?: boolean;
  /** Which video to start on when uncontrolled (e.g. a mobile "Watch" chip opening the modal to a specific clip). Ignored when `activeVideoId` is set. */
  initialVideoId?: VideoId;
};

/**
 * Owns all playback/navigation state for a VideoExperience instance. Kept
 * separate from the component so the same state machine drives both the
 * modal and sticky shells without duplicating logic.
 */
export function useVideoExperience({
  videos,
  activeVideoId,
  onActiveVideoChange,
  onNavigate,
  autoplayOnMount = false,
  initialVideoId,
}: UseVideoExperienceOptions) {
  const [internalId, setInternalId] = useState(initialVideoId ?? videos[0].id);
  const currentId = activeVideoId ?? internalId;
  const currentIndex = Math.max(
    0,
    videos.findIndex((video) => video.id === currentId),
  );
  const currentVideo = videos[currentIndex];
  const nextVideo = videos[currentIndex + 1] ?? null;
  const hasPrevVideo = currentIndex > 0;

  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentVideo.durationSeconds);
  const [ended, setEnded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [preloadNext, setPreloadNext] = useState(false);

  // Reset per-video playback state whenever the underlying video changes,
  // and autoplay - every id change after the first render is a deliberate
  // user action (ToC/chip click, next/prev, end card), so resuming
  // playback on the new clip matches what the visitor just asked for.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentVideo.durationSeconds);
    setEnded(false);
    setPreloadNext(false);
    setIsPlaying(false);

    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      if (autoplayOnMount) {
        videoEl.play().catch(() => {});
      }
      return;
    }

    videoEl.play().catch(() => {});
    // currentVideo.durationSeconds intentionally omitted - only currentId should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const goToId = useCallback(
    (id: VideoId) => {
      const target = videos.find((video) => video.id === id);
      if (!target) return;
      if (activeVideoId === undefined) setInternalId(id);
      onActiveVideoChange?.(id);
      onNavigate?.(target);
    },
    [videos, activeVideoId, onActiveVideoChange, onNavigate],
  );

  const next = useCallback(() => {
    if (nextVideo) goToId(nextVideo.id);
  }, [nextVideo, goToId]);

  const prev = useCallback(() => {
    const previous = videos[currentIndex - 1];
    if (previous) goToId(previous.id);
  }, [videos, currentIndex, goToId]);

  const restart = useCallback(() => {
    goToId(videos[0].id);
  }, [videos, goToId]);

  const replay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = 0;
    setCurrentTime(0);
    setEnded(false);
    videoEl.play().catch(() => {});
  }, []);

  const play = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleMute = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsMuted(videoEl.muted);
  }, []);

  const toggleTranscript = useCallback(() => {
    setTranscriptOpen((open) => !open);
  }, []);

  const toggleToc = useCallback(() => {
    setTocOpen((open) => !open);
  }, []);

  const closeToc = useCallback(() => {
    setTocOpen(false);
  }, []);

  // --- native <video> element event handlers ---
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setPreloadNext(true);
  }, []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setEnded(true);
  }, []);
  const handleTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      setCurrentTime(event.currentTarget.currentTime);
    },
    [],
  );
  const handleLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      setDuration(event.currentTarget.duration);
    },
    [],
  );

  return {
    videos,
    currentIndex,
    currentVideo,
    nextVideo,
    hasPrevVideo,
    videoRef,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    ended,
    transcriptOpen,
    tocOpen,
    preloadNext,
    actions: {
      goToId,
      next,
      prev,
      restart,
      replay,
      play,
      pause,
      togglePlay,
      seek,
      toggleMute,
      toggleTranscript,
      toggleToc,
      closeToc,
    },
    videoElementProps: {
      onPlay: handlePlay,
      onPause: handlePause,
      onEnded: handleEnded,
      onTimeUpdate: handleTimeUpdate,
      onLoadedMetadata: handleLoadedMetadata,
    },
  };
}

export type VideoExperienceState = ReturnType<typeof useVideoExperience>;
