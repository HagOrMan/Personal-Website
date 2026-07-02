'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { getCssColorAsThreeColor } from '@/lib/threeJsUtils';
import { cn } from '@/lib/utils';

/**
 * =========================================================================
 * WAVE SPRAY TUNING GUIDE
 * =========================================================================
 * Modify the constants below to fundamentally change the particle physics
 * and appearance of the wave.
 * * --- 1. PARTICLE ALLOCATION (The Core Structure) ---
 * @constant CORE_COUNT How many particles trace the exact mathematical center
 * of the sine wave. A higher number creates a solid line; a lower number
 * creates a dotted, sparse look.
 * @constant SPRAY_COUNT How many particles are allowed to drift away from the
 * center line. Higher numbers cost more performance but look like a thicker mist.
 * @constant WAVE_WIDTH The horizontal span (in world units) of the wave.
 * Increase this if your container is ultra-wide and you can see the edges popping.
 * * --- 2. PHYSICS DEFAULTS (The Math Variables) ---
 * @constant defaultWaveSpeed (0.9) - The base scrolling speed of the wave on the X axis.
 * @constant defaultWaveAmplitude (0.55) - The height/depth of the wave (Y axis).
 * Higher numbers result in extreme peaks and deep troughs.
 * @constant defaultWaveFrequency (1.6) - Determines how tightly "bunched" the waves
 * are. Higher frequency = more wave crests visible on screen at once.
 * @constant defaultSprayRange (0.9) - The maximum vertical distance a spray
 * particle can travel before its lifecycle ends and it respawns at the core.
 * * --- 3. AESTHETICS ---
 * @constant defaultLushColour / defaultBreezeColour - The fallback colors used
 * if no props are provided (tied to OceanScene themes).
 * @constant defaultAlphaBoost (1.5) - A global multiplier for particle opacity.
 * Because we use AdditiveBlending in dark mode, higher alpha = a brighter "bloom" or "glow".
 * =========================================================================
 */

// Theme defaults
const defaultLushColour = 'rgb(0, 209, 176)';
const defaultBreezeColour = 'rgb(9, 172, 238)';
const defaultAlphaBoost = 1.5;

// Physics defaults
const defaultWaveSpeed = 0.9;
const defaultWaveAmplitude = 0.55;
const defaultWaveFrequency = 1.6;
const defaultSprayRange = 0.9;

// How many particles ride the wave itself vs. spray off of it.
// The core particles have aSpread == 0, so they trace the sine line exactly.
const CORE_COUNT = 800;
const SPRAY_COUNT = 750;
const WAVE_WIDTH = 7; // world units the wave spans horizontally

type WaveSprayMaterialType = THREE.ShaderMaterial & {
  uTimeOffset: number;
  uColorStart: THREE.Color;
  uColorEnd: THREE.Color;
  uPixelRatio: number;
  uAlphaBoost: number;
  uWaveSpeed: number;
  uWaveAmplitude: number;
  uWaveFrequency: number;
  uSprayRange: number;
  uSprayFalloff: number;
  uSprayBrightness: number;
};

declare module '@react-three/fiber' {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    waveSprayShaderMaterial: any;
  }
}

// Vertex Shader: places every particle relative to a single 2D sine wave.
// Core particles (aSpread = 0) sit exactly on the wave line.
// Spray particles (aSpread != 0) hover above/below it, drifting slightly.
const vertexShader = `
    uniform float uTimeOffset;
    uniform float uPixelRatio;
    uniform float uWaveAmplitude;
    uniform float uWaveFrequency;
    uniform float uSprayRange;

    // Per-particle attributes
    attribute float aSpread; // signed [-1, 1]; 0 = on the wave line
    attribute float aRandom; // [0, 1]; used for phase + size variety

    varying float vSpread;    // normalized distance from the line, for falloff
    varying float vLife;      // lifecycle alpha (spawn fade-in / travel fade-out)
    varying float vElevation; // wave height for colour mixing

    void main() {
      vec3 pos = position;

      // --- THE WAVE LINE (2D) ---
      // Primary sine + a smaller faster one so it isn't a perfect textbook sine
      float elevation = sin(pos.x * uWaveFrequency + uTimeOffset) * uWaveAmplitude;
      elevation += sin(pos.x * uWaveFrequency * 2.3 + uTimeOffset * 1.4) * uWaveAmplitude * 0.2;

      // Is this a spray particle or part of the core line?
      // (core particles were generated with |aSpread| <= 0.04)
      float isSpray = step(0.05, abs(aSpread));

      // --- SPRAY LIFECYCLE ---
      // Each spray particle lives on a repeating loop: it's ejected from the
      // line, travels outward, fades, and respawns at the line. Phase and
      // speed are per-particle (via aRandom) so at any moment particles are
      // at every stage of the journey -> constant spray along the whole wave,
      // never a synchronized "shrink back" to the line.
      float lifeSpeed = 0.2 + 0.10 * aRandom;
      float life = fract(aRandom * 7.13 + uTimeOffset * lifeSpeed); // 0 -> 1, loops

      // Travel distance: from just off the line out to this particle's max
      // reach (|aSpread|, biased small so density thins with distance).
      float reach = abs(aSpread) * uSprayRange;
      float travel = (0.1 + 0.9 * life) * reach;
      float spray = sign(aSpread) * travel * isSpray;

      // Core particles keep only their tiny band thickness
      spray += aSpread * (1.0 - isSpray);

      pos.y = elevation + spray;

      vElevation = elevation;

      // Normalized distance from the line (for size + alpha falloff)
      vSpread = isSpray * min(travel / max(uSprayRange, 0.001), 1.0);

      // Lifecycle alpha: quick fade-in on spawn, gradual fade-out as it
      // travels away, so the respawn at the line never "pops".
      vLife = mix(1.0, smoothstep(0.0, 0.12, life) * (1.0 - life * life), isSpray);

      vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;
      gl_Position = projectionMatrix * viewPosition;

      // Core particles are chunky; spray shrinks as it gets further away
      float sizeFalloff = mix(1.0, 0.6, vSpread);
      float sizeJitter = 0.75 + aRandom * 0.5;
      gl_PointSize = 17.0 * uPixelRatio * sizeFalloff * sizeJitter;
      gl_PointSize *= (1.0 / -viewPosition.z);
    }
  `;

// Fragment Shader: creates the soft glow and handles color mixing based on height.
const fragmentShader = `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    uniform float uAlphaBoost;
    uniform float uSprayFalloff;   // pow exponent: higher = spray dies faster
    uniform float uSprayBrightness; // 0-1: lightens spray toward white (dark mode)

    varying float vSpread;
    varying float vLife;
    varying float vElevation;

    void main() {
      // Soft glowing circle
      float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
      float strength = 0.05 / distanceToCenter - 0.1;
      if (strength < 0.0) discard;

      // Colour: crests lean uColorEnd, troughs lean uColorStart
      float mixStrength = clamp((vElevation + 0.4) * 1.2, 0.0, 1.0);
      vec3 color = mix(uColorStart, uColorEnd, mixStrength);

      // Dark-mode visibility trick: instead of a background, push spray
      // colour toward white the further it gets from the line. With
      // additive blending, brightness IS visibility, so faint far spray
      // reads as pale glints against near-black. 0.0 in light mode.
      color = mix(color, vec3(1.0), uSprayBrightness * vSpread);

      // Density falloff: core line is solid, spray fades with distance,
      // modulated by the particle's lifecycle (vLife) so ejected particles
      // fade out at max reach and fade in on respawn.
      float sprayFade = pow(1.0 - vSpread, uSprayFalloff);
      float alpha = strength * uAlphaBoost * mix(0.3, 1.0, sprayFade) * vLife;

      gl_FragColor = vec4(color, alpha);
    }
  `;

const WaveSprayShaderMaterial = shaderMaterial(
  {
    uTimeOffset: 0,
    uColorStart: new THREE.Color(defaultLushColour),
    uColorEnd: new THREE.Color(defaultBreezeColour),
    uPixelRatio: 1,
    uAlphaBoost: defaultAlphaBoost,
    uWaveSpeed: defaultWaveSpeed,
    uWaveAmplitude: defaultWaveAmplitude,
    uWaveFrequency: defaultWaveFrequency,
    uSprayRange: defaultSprayRange,
    uSprayFalloff: 1.2, // dark-mode default (gentle falloff)
    uSprayBrightness: 0.4, // dark-mode default (spray glints toward white)
  },
  vertexShader,
  fragmentShader,
);

extend({ WaveSprayShaderMaterial });

interface WaveSprayPointsProps {
  colorStart?: string;
  colorEnd?: string;
}

const WaveSprayPoints = ({ colorStart, colorEnd }: WaveSprayPointsProps) => {
  const materialRef = useRef<WaveSprayMaterialType>(null);
  const { resolvedTheme } = useResolvedTheme();

  // Same accumulated-offset trick as OceanScene so theme changes don't
  // make the wave jump backwards when speed changes.
  const timeOffsetRef = useRef(0);

  const [blendingMode, setBlendingMode] = useState<THREE.Blending>(
    THREE.AdditiveBlending,
  );

  // Theme targets, lerped every frame
  const targetStart = useRef(new THREE.Color(defaultLushColour));
  const targetEnd = useRef(new THREE.Color(defaultBreezeColour));
  const targetAlphaBoost = useRef(defaultAlphaBoost);
  const targetSpeed = useRef(defaultWaveSpeed);
  const targetAmplitude = useRef(defaultWaveAmplitude);
  const targetFrequency = useRef(defaultWaveFrequency);
  const targetSprayRange = useRef(defaultSprayRange);
  const targetSprayFalloff = useRef(1.2);
  const targetSprayBrightness = useRef(0.4);

  // Build the particle attributes once. Core particles trace the line,
  // spray particles carry a signed spread biased toward the line (pow)
  // so density thins out the further you get from the wave.
  const { positions, spreads, randoms } = useMemo(() => {
    const total = CORE_COUNT + SPRAY_COUNT;
    const positions = new Float32Array(total * 3);
    const spreads = new Float32Array(total);
    const randoms = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const isCore = i < CORE_COUNT;

      // x spread evenly-ish across the wave with a little jitter
      const x = (Math.random() - 0.5) * WAVE_WIDTH;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0; // y computed in the shader
      positions[i * 3 + 2] = 0; // flat: it's a 2D wave

      if (isCore) {
        // A tiny bit of thickness so the line reads as a band, not 1px
        spreads[i] = (Math.random() - 0.5) * 0.08;
      } else {
        // Signed spread, biased toward the line: pow keeps most spray
        // close, with a sparse haze further out. Floor of 0.06 keeps it
        // above the shader's core/spray threshold (0.05).
        const sign = Math.random() < 0.5 ? -1 : 1;
        spreads[i] = sign * (0.06 + 0.94 * Math.pow(Math.random(), 1.8));
      }

      randoms[i] = Math.random();
    }

    return { positions, spreads, randoms };
  }, []);

  useEffect(() => {
    // Helper function: Routes CSS variables to our DOM reader, and static colors to Three.js
    const parsePropColor = (colorStr: string, fallback: string) => {
      if (colorStr.startsWith('--')) {
        // It's a CSS variable; query the DOM and apply linear gamma correction automatically
        return getCssColorAsThreeColor(colorStr, fallback);
      }
      // It's a static color string; instantiate and apply linear gamma correction manually
      const c = new THREE.Color(colorStr);
      c.convertSRGBToLinear();
      return c;
    };

    // Parse the incoming props, falling back to the default semantic theme colors
    targetStart.current = colorStart
      ? parsePropColor(colorStart, defaultLushColour)
      : getCssColorAsThreeColor('--shader-lush', defaultLushColour);

    targetEnd.current = colorEnd
      ? parsePropColor(colorEnd, defaultBreezeColour)
      : getCssColorAsThreeColor('--shader-breeze', defaultBreezeColour);

    const isLightMode = resolvedTheme === 'light';

    if (isLightMode) {
      // Flowing water: slower, taller, thicker ink
      targetSpeed.current = 1.05;
      targetAmplitude.current = 0.7;
      targetFrequency.current = 1.2;
      targetSprayRange.current = 0.75;
      targetSprayFalloff.current = 2.0; // ink spray fades quickly
      targetSprayBrightness.current = 0.0; // whitening would vanish on light bg
      targetAlphaBoost.current = 4.0;
      setBlendingMode(THREE.NormalBlending);
    } else {
      // Electric/storm: faster, tighter, glowing spray thrown further
      targetSpeed.current = 1.5;
      targetAmplitude.current = 0.55;
      targetFrequency.current = 1.6;
      targetSprayRange.current = 0.9;
      targetSprayFalloff.current = 1.1; // gentle falloff so glow spray survives dark bg
      targetSprayBrightness.current = 0.45; // far spray glints toward white
      targetAlphaBoost.current = 1.5;
      setBlendingMode(THREE.AdditiveBlending);
    }

    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [resolvedTheme, colorStart, colorEnd]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    const mat = materialRef.current;

    mat.uWaveSpeed = THREE.MathUtils.lerp(
      mat.uWaveSpeed,
      targetSpeed.current,
      0.025,
    );
    mat.uWaveAmplitude = THREE.MathUtils.lerp(
      mat.uWaveAmplitude,
      targetAmplitude.current,
      0.03,
    );
    mat.uWaveFrequency = THREE.MathUtils.lerp(
      mat.uWaveFrequency,
      targetFrequency.current,
      0.05,
    );
    mat.uSprayRange = THREE.MathUtils.lerp(
      mat.uSprayRange,
      targetSprayRange.current,
      0.03,
    );
    mat.uSprayFalloff = THREE.MathUtils.lerp(
      mat.uSprayFalloff,
      targetSprayFalloff.current,
      0.05,
    );
    mat.uSprayBrightness = THREE.MathUtils.lerp(
      mat.uSprayBrightness,
      targetSprayBrightness.current,
      0.05,
    );

    timeOffsetRef.current += delta * mat.uWaveSpeed;
    mat.uTimeOffset = timeOffsetRef.current;

    mat.uColorStart.lerp(targetStart.current, 0.05);
    mat.uColorEnd.lerp(targetEnd.current, 0.05);

    mat.uAlphaBoost = THREE.MathUtils.lerp(
      mat.uAlphaBoost,
      targetAlphaBoost.current,
      0.05,
    );
  });

  const pixelRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach='attributes-position' args={[positions, 3]} />
        <bufferAttribute attach='attributes-aSpread' args={[spreads, 1]} />
        <bufferAttribute attach='attributes-aRandom' args={[randoms, 1]} />
      </bufferGeometry>
      <waveSprayShaderMaterial
        ref={materialRef}
        key={blendingMode}
        transparent={true}
        depthWrite={false}
        blending={blendingMode}
        uPixelRatio={pixelRatio}
      />
    </points>
  );
};

export interface WaveSprayProps {
  className?: string;
  /** * Any valid CSS color string for the lower troughs of the wave.
   * (e.g. '#ff0000', 'rgb(255, 0, 0)', 'red').
   * Overrides theme defaults.
   */
  colorStart?: string;
  /** * Any valid CSS color string for the upper crests of the wave.
   * Overrides theme defaults.
   */
  colorEnd?: string;
}

/**
 * Small 2D "wave with spray" ambient animation.
 *
 * A dense band of particles traces a moving sine wave, with sparser,
 * fainter particles spraying off above and below it.
 *
 * Self-contained (owns its Canvas), transparent background, no controls.
 * Drop it straight into a decoration slot:
 *
 * <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
 * <WaveSpray colorStart="#FF0055" colorEnd="#00E5FF" />
 * </div>
 */
export const WaveSpray = ({
  className,
  colorStart,
  colorEnd,
}: WaveSprayProps) => {
  const [isReady, setIsReady] = useState(false);

  return (
    <div
      className={cn(
        'h-full w-full transition-opacity duration-1000 ease-in-out',
        isReady ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      <Canvas
        className='select-none'
        // Straight-on camera => reads as flat/2D
        camera={{ position: [0, 0, 3.2], fov: 55 }}
        gl={{ alpha: true }} // transparent so the slot's bg shows through
        onCreated={() => setIsReady(true)}
      >
        <WaveSprayPoints colorStart={colorStart} colorEnd={colorEnd} />
      </Canvas>
    </div>
  );
};
