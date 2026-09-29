'use client';

import { useEffect, useRef } from 'react';

// Every mounted player, site-wide. Starting one pauses the rest, so a piece
// left playing on the page underneath a modal can't overlap the one in it.
const players = new Set<HTMLAudioElement>();

export function pauseAllAudio() {
  for (const player of players) player.pause();
}

/**
 * A native audio control that only ever plays alone. `preload='none'` is
 * load-bearing: without it every mounted player fetches its MP3 up front.
 */
export function ExclusiveAudio({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    players.add(audio);
    return () => {
      players.delete(audio);
      audio.pause();
    };
  }, []);

  return (
    <audio
      ref={ref}
      src={src}
      controls
      controlsList='nodownload noplaybackrate'
      preload='none'
      aria-label={`Recording of ${title}`}
      className='w-full'
      onPlay={() => {
        for (const other of players) {
          if (other !== ref.current) other.pause();
        }
      }}
    />
  );
}
