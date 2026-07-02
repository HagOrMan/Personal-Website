'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { getCssColorAsThreeColor } from '@/lib/threeJsUtils';
import { cn } from '@/lib/utils';

// Same theme defaults as OceanScene so both components feel related
const defaultLushColour = 'rgb(0, 209, 176)';
const defaultBreezeColour = 'rgb(9, 172, 238)';
const defaultAlphaBoost = 1.5;

// Physics defaults (Dark Mode / Electric)
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

// Fragment Shader: same soft-glow circle as OceanScene, but opacity also
// falls off with distance from the wave line (vSpread).
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

const WaveSprayPoints = () => {
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
    targetStart.current = getCssColorAsThreeColor(
      '--shader-lush',
      defaultLushColour,
    );
    targetEnd.current = getCssColorAsThreeColor(
      '--shader-breeze',
      defaultBreezeColour,
    );

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

      // --- ALTERNATIVE: if spray is still too faint against a dark bg ---
      // AdditiveBlending multiplies against what's behind it, so low-alpha
      // spray on near-black ≈ invisible. NormalBlending paints the colour
      // directly, at the cost of losing the "glow" look. Swap the two lines
      // above for these to try it:
      // targetAlphaBoost.current = 2.5;
      // setBlendingMode(THREE.NormalBlending);
    }

    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [resolvedTheme]);

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

/**
 * Small 2D "wave with spray" ambient animation.
 *
 * A dense band of particles traces a moving sine wave, with sparser,
 * fainter particles spraying off above and below it. Shares the same
 * theme colours + light/dark physics personality as OceanScene.
 *
 * Self-contained (owns its Canvas), transparent background, no controls.
 * Drop it straight into the PageHeader `decoration` slot:
 *
 *   <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
 *     <WaveSpray />
 *   </div>
 */
export const WaveSpray = ({ className }: { className?: string }) => {
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
        <WaveSprayPoints />
      </Canvas>
    </div>
  );
};
