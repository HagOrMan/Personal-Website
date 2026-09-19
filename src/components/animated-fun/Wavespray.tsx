'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { useIsOnScreen, usePrefersReducedMotion } from '@/lib/screenUtils';
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
const defaultSprayFalloff = 1.2; // dark-mode default (gentle falloff)
const defaultSprayBrightness = 0.4; // dark-mode default (spray glints toward white)

/**
 * The largest step the wave clock will take in a single frame, in seconds.
 *
 * R3F hands useFrame the wall-clock time since the last frame. Under
 * frameloop 'always' that's a frame time, and under 'never' the clock is
 * stopped and restarted so resuming is clean - but under 'demand' (reduced
 * motion) the clock keeps running while frames don't, so the one frame a
 * theme switch asks for can arrive minutes after the last one and carry the
 * entire gap. Fed straight into the offset below, that teleports the wave to
 * an unrelated phase.
 *
 * A tenth of a second is well past a real frame (that's 10fps) so nothing
 * healthy is ever clamped. A genuinely slow device runs its wave slightly
 * slow instead of skipping, which is the right way round.
 */
const MAX_FRAME_DELTA = 0.1;

// How many particles ride the wave itself vs. spray off of it.
// The core particles have aSpread == 0, so they trace the sine line exactly.
//
// Down from 800/750, but not evenly - these two saturate at very different
// rates. The core is a dense band tracing one sine curve, so past a few
// hundred points it's a solid line and more of them add nothing. The spray
// is a haze: its perceived density is roughly linear in particle count,
// spread over a much larger area and thinned further by the per-particle
// lifecycle fade. An even cut took the spray visibly below the intended
// effect while the core looked unchanged, so the core absorbs most of it.
//
// On the per-frame budget: at the 96px slot this renders into, each sprite
// averages ~700 device px² at the old uncapped DPR 1.75, so the original
// 1,550 shaded ~1.1M fragments over a 28K-pixel canvas - ~38x overdraw,
// additively blended with depthWrite:false so there's no early-Z to reject
// any of it. dpr={[1, 1.5]} on the Canvas is worth a flat 26% of that on its
// own, because gl_PointSize scales with uPixelRatio too, so sprite area
// shrinks with the backing store. These counts land at ~591K fragments, a
// little over half the audited load - and the frameloop gating, not the
// count, is what actually took this off the main thread.
const CORE_COUNT = 500;
const SPRAY_COUNT = 650;
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
    uSprayFalloff: defaultSprayFalloff,
    uSprayBrightness: defaultSprayBrightness,
  },
  vertexShader,
  fragmentShader,
);

extend({ WaveSprayShaderMaterial });

interface WaveSprayPointsProps {
  colorStart?: string;
  colorEnd?: string;
  /**
   * True when this scene only ever gets a single frame (reduced motion - see
   * the frameloop in WaveSpray). Every easing factor collapses to 1 so that
   * one frame lands on the final colour/physics values instead of a few
   * percent of the way there.
   */
  snap: boolean;
}

const WaveSprayPoints = ({
  colorStart,
  colorEnd,
  snap,
}: WaveSprayPointsProps) => {
  const materialRef = useRef<WaveSprayMaterialType>(null);
  const { resolvedTheme } = useResolvedTheme();

  // This root's own invalidate, not the module-level one (which invalidates
  // every root on the page).
  const invalidate = useThree((state) => state.invalidate);
  const frameloop = useThree((state) => state.frameloop);

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
  const targetSprayFalloff = useRef(defaultSprayFalloff);
  const targetSprayBrightness = useRef(defaultSprayBrightness);

  /**
   * A mirror of where the lerp below has actually got to, kept because the
   * material it lives on doesn't survive a theme switch.
   *
   * Everything the easing builds up - speed, amplitude, frequency, spray
   * range/falloff/brightness, alpha, colours - is stored as uniforms *on the
   * material instance*, and the material is keyed on blendingMode (see the
   * note on it further down), so every light/dark toggle throws that instance
   * away and builds a fresh one back at the shaderMaterial() defaults.
   *
   * Those defaults are the dark-mode settings, near enough. In dark mode the
   * reset barely shows. In light mode it puts frequency back to 1.6 instead
   * of 1.2, speed to 0.9 instead of 1.7 and alpha boost to 1.5 instead of
   * 4.0 - and frequency multiplies pos.x in the vertex shader, so a wrong
   * frequency is a wrong *spatial phase* across the whole wave, not just a
   * wrong look. Getting back out of it takes a hundred-odd frames of lerp,
   * which only happens if frames are running. Toggle the theme while this
   * decoration is scrolled away and frameloop is 'never', so none are: you
   * scroll back up to a wave at the wrong phase that then visibly writhes
   * into place.
   *
   * Mirroring the values here and writing them back onto the replacement
   * makes the swap lossless: the new material picks up exactly where the old
   * one left off, the easing continues toward whatever the new theme's
   * targets are, and there are no defaults to be stranded on.
   *
   * uTimeOffset isn't in here - timeOffsetRef already outlives the material
   * and useFrame writes it back on the first frame either way.
   */
  const liveRef = useRef({
    speed: defaultWaveSpeed,
    amplitude: defaultWaveAmplitude,
    frequency: defaultWaveFrequency,
    sprayRange: defaultSprayRange,
    sprayFalloff: defaultSprayFalloff,
    sprayBrightness: defaultSprayBrightness,
    alphaBoost: defaultAlphaBoost,
    colorStart: new THREE.Color(defaultLushColour),
    colorEnd: new THREE.Color(defaultBreezeColour),
  });

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
      targetSpeed.current = 1.7;
      targetAmplitude.current = 0.6;
      targetFrequency.current = 1.2;
      targetSprayRange.current = 0.75;
      targetSprayFalloff.current = 2.0; // ink spray fades quickly
      targetSprayBrightness.current = 0.0; // whitening would vanish on light bg
      targetAlphaBoost.current = 4.0;
      setBlendingMode(THREE.NormalBlending);
    } else {
      // Electric/storm: faster, tighter, glowing spray thrown further
      targetSpeed.current = 2.5;
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

    // These targets live in refs, so React never re-renders and R3F never
    // learns anything changed. Under frameloop='demand' that would strand a
    // theme switch on the old colours - ask for the one frame that applies
    // them. A no-op under 'always'.
    invalidate();
  }, [resolvedTheme, colorStart, colorEnd, invalidate]);

  // R3F's setFrameloop doesn't schedule a frame of its own, so coming back
  // from 'never' to 'demand' (a reduced-motion visitor scrolling the header
  // back into view) would resume a loop that then renders nothing. Ask for
  // the one frame that repaints it.
  useEffect(() => {
    if (frameloop === 'demand') invalidate();
  }, [frameloop, invalidate]);

  /**
   * Hands the mirrored values to whichever material instance is current.
   *
   * Keyed on blendingMode because that's what replaces the material: React
   * mounts the new one during the same commit that changes the key, so by the
   * time this runs, materialRef points at the replacement and it's sitting on
   * its constructor defaults. On first mount this writes the defaults back
   * over themselves, which is a no-op worth having for the simpler code.
   *
   * The invalidate() matters under frameloop 'demand' (reduced motion), where
   * nothing would otherwise ask for the frame that shows this.
   */
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;

    const live = liveRef.current;
    mat.uWaveSpeed = live.speed;
    mat.uWaveAmplitude = live.amplitude;
    mat.uWaveFrequency = live.frequency;
    mat.uSprayRange = live.sprayRange;
    mat.uSprayFalloff = live.sprayFalloff;
    mat.uSprayBrightness = live.sprayBrightness;
    mat.uAlphaBoost = live.alphaBoost;
    mat.uColorStart.copy(live.colorStart);
    mat.uColorEnd.copy(live.colorEnd);

    invalidate();
  }, [blendingMode, invalidate]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    const mat = materialRef.current;

    // When only one frame is coming, every easing factor has to be 1 or the
    // wave freezes partway to its targets.
    const ease = (current: number, target: number, factor: number) =>
      THREE.MathUtils.lerp(current, target, snap ? 1 : factor);

    mat.uWaveSpeed = ease(mat.uWaveSpeed, targetSpeed.current, 0.025);
    mat.uWaveAmplitude = ease(mat.uWaveAmplitude, targetAmplitude.current, 0.03);
    mat.uWaveFrequency = ease(mat.uWaveFrequency, targetFrequency.current, 0.05);
    mat.uSprayRange = ease(mat.uSprayRange, targetSprayRange.current, 0.03);
    mat.uSprayFalloff = ease(
      mat.uSprayFalloff,
      targetSprayFalloff.current,
      0.05,
    );
    mat.uSprayBrightness = ease(
      mat.uSprayBrightness,
      targetSprayBrightness.current,
      0.05,
    );

    // Step capped so a frame arriving after a long gap can't fling the wave
    // to an unrelated phase - see MAX_FRAME_DELTA.
    timeOffsetRef.current += Math.min(delta, MAX_FRAME_DELTA) * mat.uWaveSpeed;
    mat.uTimeOffset = timeOffsetRef.current;

    mat.uColorStart.lerp(targetStart.current, snap ? 1 : 0.05);
    mat.uColorEnd.lerp(targetEnd.current, snap ? 1 : 0.05);

    mat.uAlphaBoost = ease(mat.uAlphaBoost, targetAlphaBoost.current, 0.05);

    // Last thing each frame: record where the easing got to, so the next
    // material to be built can start from here rather than from the
    // defaults. See liveRef.
    const live = liveRef.current;
    live.speed = mat.uWaveSpeed;
    live.amplitude = mat.uWaveAmplitude;
    live.frequency = mat.uWaveFrequency;
    live.sprayRange = mat.uSprayRange;
    live.sprayFalloff = mat.uSprayFalloff;
    live.sprayBrightness = mat.uSprayBrightness;
    live.alphaBoost = mat.uAlphaBoost;
    live.colorStart.copy(mat.uColorStart);
    live.colorEnd.copy(mat.uColorEnd);
  });

  // The renderer's ratio, not the display's. `dpr={[1, 1.5]}` on the Canvas
  // caps the backing store, and the sprite size in the vertex shader is
  // multiplied by this - reading raw window.devicePixelRatio here (as this
  // used to) would size sprites for a 1.75x buffer that no longer exists,
  // so they'd render ~17% too large against the capped canvas.
  const pixelRatio = useThree((state) => state.viewport.dpr);

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

  const containerRef = useRef<HTMLDivElement>(null);
  const onScreen = useIsOnScreen(containerRef);
  const prefersReducedMotion = usePrefersReducedMotion();

  // The loop itself has to stop - returning early from useFrame would not
  // have helped, because R3F still calls gl.render() every tick and drawing
  // hundreds of additively blended points *is* the cost. This decoration sits
  // beside the <h1>, so it leaves the viewport within one screen of scrolling.
  //
  //   never  - scrolled past, or the tab is backgrounded: no frames at all
  //   demand - reduced motion: one static frame, no ongoing animation
  //   always - visible, and motion is welcome: the wave as designed
  const frameloop = !onScreen
    ? 'never'
    : prefersReducedMotion
      ? 'demand'
      : 'always';

  return (
    <div
      ref={containerRef}
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
        frameloop={frameloop}
        // Uncapped, this took raw devicePixelRatio - 1.75 on the audited
        // phone, so a 96px slot got a 168x168 backing store. Capping at 1.5
        // cuts the fragment count ~27% and is indistinguishable at this size.
        dpr={[1, 1.5]}
        onCreated={() => setIsReady(true)}
      >
        <WaveSprayPoints
          colorStart={colorStart}
          colorEnd={colorEnd}
          snap={prefersReducedMotion}
        />
      </Canvas>
    </div>
  );
};
