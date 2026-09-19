'use client';

import dynamic from 'next/dynamic';

import type { WaveSprayProps } from '@/components/animated-fun/Wavespray';

// WaveSpray drags in three + @react-three/fiber + @react-three/drei - ~100 KiB
// of chunk that Lighthouse measured compiling for 176 ms right in the window
// /about-me's LCP was waiting on, for a 96px decoration beside the page title.
// Splitting it keeps all of that off the critical path.
//
// This wrapper exists because the pages using WaveSpray in a `decoration` slot
// are server components, and `dynamic(..., { ssr: false })` is only legal in a
// client module.
//
// No `loading` fallback on purpose: the decoration's slot already has fixed
// dimensions (so there's nothing to shift), and WaveSpray fades itself in on
// its canvas's onCreated anyway - arriving a beat later is invisible.
const WaveSprayImpl = dynamic(
  () => import('@/components/animated-fun/Wavespray').then((m) => m.WaveSpray),
  { ssr: false },
);

export const WaveSprayLazy = (props: WaveSprayProps) => (
  <WaveSprayImpl {...props} />
);
