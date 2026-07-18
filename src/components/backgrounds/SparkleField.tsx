'use client';

import React, { useEffect, useState } from 'react';

import { Sparkles } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { getCssColorAsThreeColor } from '@/lib/threeJsUtils';
import { cn } from '@/lib/utils';

interface SparkleFieldProps {
  className?: string;
}

/**
 * Ambient full-bleed backdrop: a field of particles that drift slowly (like
 * dust caught in a breeze) and twinkle in and out on their own, star-like.
 * No flocking/collision logic - drei's Sparkles already gives each particle
 * its own gentle noise-driven wander and fade.
 *
 * Tinted nebula (purple) rather than lush/breeze so it reads as a distinct
 * backdrop layer behind the lush-to-breeze LiquidGlassCard, instead of
 * blending into it. Prominent in dark mode, dialed down to a faint accent
 * in light mode via the wrapper's opacity.
 */
export const SparkleField = ({ className }: SparkleFieldProps) => {
  const [isReady, setIsReady] = useState(false);
  const { resolvedTheme } = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const [color, setColor] = useState(() => new THREE.Color('#c4b5fd'));

  useEffect(() => {
    setColor(
      getCssColorAsThreeColor(
        isDark ? '--tw-color-nebula-300' : '--tw-color-nebula-800',
        isDark ? '#c4b5fd' : '#4b29aa',
      ),
    );
  }, [isDark]);

  return (
    <div
      className={cn(
        'h-full w-full transition-opacity duration-1000 ease-in-out',
        isReady ? (isDark ? 'opacity-100' : 'opacity-70') : 'opacity-0',
        className,
      )}
    >
      <Canvas
        className='pointer-events-none select-none'
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ alpha: true }}
        dpr={[1, 2]}
        onCreated={() => setIsReady(true)}
      >
        <Sparkles
          count={220}
          scale={[18, 10, 6]}
          size={2.5}
          speed={0.3}
          noise={1}
          opacity={isDark ? 0.9 : 0.8}
          color={color}
        />
      </Canvas>
    </div>
  );
};
