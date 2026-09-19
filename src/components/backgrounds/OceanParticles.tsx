'use client';

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { shaderMaterial } from '@react-three/drei';
import {
  Canvas,
  extend,
  invalidate,
  ThreeEvent,
  useFrame,
  useThree,
} from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { useIsOnScreen, usePrefersReducedMotion } from '@/lib/screenUtils';
import { getCssColorAsThreeColor } from '@/lib/threeJsUtils';
import { cn } from '@/lib/utils';

/**
 * Deep-imported and lazy rather than pulled from the drei barrel: OrbitControls
 * drags in three-stdlib's implementation, which is dead weight until someone
 * actually drags the ocean. R3F supports Suspense inside <Canvas>, so the
 * particles paint immediately and orbiting starts working a moment later.
 */
const OrbitControls = lazy(() =>
  import('@react-three/drei/core/OrbitControls').then((m) => ({
    default: m.OrbitControls,
  })),
);

const defaultLushColour = 'rgb(0, 209, 176)';
const defaultBreezeColour = 'rgb(9, 172, 238)';
const defaultBgColour = 'rgb(0, 209, 176)';
const defaultAlphaBoost = 1.5;
// Default Physics (Dark Mode / Electric defaults)
const defaultWaveSpeed = 0.75;
const defaultWaveElevation = 0.6;
const defaultWaveFrequency = 1.5;

/**
 * The largest step the wave clock will take in a single frame, in seconds.
 *
 * R3F hands useFrame the wall-clock time since the last frame, and with
 * frameloop 'never' there may not have been one for minutes. Feeding that
 * straight into the clock teleports the whole wave field to a new phase the
 * instant the loop starts again - which is what a theme switch does while the
 * hero is scrolled out of view: swapping the blending mode re-renders the R3F
 * tree, which takes one frame, and that frame carries the entire time spent
 * away.
 *
 * A tenth of a second is well past a real frame (that's 10fps) so nothing
 * healthy is ever clamped, and it means the ocean resumes where it left off
 * rather than somewhere unrelated. A genuinely slow device runs its waves
 * slightly slow instead of skipping, which is the right way round.
 */
const MAX_FRAME_DELTA = 0.1;

/**
 * Where the wave clock wraps back to zero, in shader time units.
 *
 * uTimeOffset is a 32-bit float that the vertex shader feeds straight into
 * sin(). Left to climb forever it eventually reaches magnitudes where the gap
 * between representable floats is a visible fraction of a radian, and the
 * three wave terms - which use it at 1.0x, 0.8x and 2.0x - quantise by
 * different amounts. Neighbouring particles then land on stepped phases
 * instead of a smooth curve: the field tears into bands, parts of a swell
 * appear to jump to the bottom of the next one, and the two multiplied sines
 * flatten each other out so the whole ocean reads smaller. Exactly the
 * "chopped, zoomed out" state, and it never recovers on its own because
 * nothing ever brings the number back down.
 *
 * 10π is the smallest wrap that's seamless for all three: it's 5 periods of
 * the 1.0x term, 4 of the 0.8x, and 10 of the 2.0x, so every one of them is
 * mid-cycle at exactly the same place before and after. At ~35s per wrap the
 * clock never leaves single digits of magnitude, where float precision is
 * far finer than anything visible.
 */
const WAVE_TIME_PERIOD = Math.PI * 10;

// Particle grid density, expressed as planeGeometry segment counts. Desktop
// keeps the original 256x128 (33,153 points). Phones get a quarter of the
// geometry: at a 6px point size on a ~400px-wide screen the two are very hard
// to tell apart, and this is the single biggest lever on mobile fill rate.
const DESKTOP_SEGMENTS: [number, number] = [256, 128];
const MOBILE_SEGMENTS: [number, number] = [128, 64];
const MOBILE_QUERY = '(max-width: 1023px)';

type OceanParticleType = THREE.ShaderMaterial & {
  uTimeOffset: number;
  uColorStart: THREE.Color;
  uColorEnd: THREE.Color;
  uPixelRatio: number;
  uAlphaBoost: number;
  uWaveSpeed: number;
  uWaveElevation: number;
  uWaveFrequency: number;
  uMouseClick: THREE.Vector2;
  uLastClickTime: number;
};

declare module '@react-three/fiber' {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    waveShaderMaterial: any;
  }
}

// Vertex Shader: Calculates position and movement
const vertexShader = `
    // Use time offset because using just time makes light/dark mode transition funky
    uniform float uTimeOffset;
    uniform float uPixelRatio;

    uniform float uWaveElevation;
    uniform float uWaveFrequency;
    
    varying float vElevation; // Pass wave height to fragment shader for coloring

    // Variables for enabling clicks to add ripples
    uniform vec2 uMouseClick;
    uniform float uLastClickTime;

    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);

      // --- WAVE LOGIC ---
      // We combine two Sine waves to make the movement look more organic/oceanic
      // Wave 1 (Big swells)
      float elevation = sin(modelPosition.x * uWaveFrequency + uTimeOffset) 
                      * sin(modelPosition.z * (uWaveFrequency * 0.8) + uTimeOffset * 0.8) 
                      * uWaveElevation;
      
      // Secondary ripples
      elevation -= abs(sin(modelPosition.x * (uWaveFrequency * 2.5) + uTimeOffset * 2.0) * 0.1);

      // --- CLICK RIPPLE LOGIC ---
      float dist = distance(modelPosition.xz, uMouseClick);
      float timeSinceClick = uTimeOffset - uLastClickTime;

      // Create a pulse that moves outward over time
      // Use a sine wave masked by an exponential decay so it fades out
      // In Dark mode, ripples zip out fast.
      // In Light mode, they gently expand.
      float ripple = sin(dist * 5.0 - timeSinceClick * 10.0) * exp(-dist * 0.5) * exp(-timeSinceClick * 1.5);

      // Only apply ripple if the click is recent
      if(timeSinceClick < 5.0 && timeSinceClick >= 0.0) {
          elevation += ripple * 0.3; 
      }

      modelPosition.y += elevation;
      vElevation = elevation; 

      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectedPosition = projectionMatrix * viewPosition;

      gl_Position = projectedPosition;

      // Dynamic Particle Size
      // Size attenuates (gets smaller) the further away it is from camera
      gl_PointSize = 6.0 * uPixelRatio; // Base size
      gl_PointSize *= (1.0 / -viewPosition.z);
    }
  `;

// Fragment Shader: Calculates color and shape of each particle
const fragmentShader = `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    uniform float uAlphaBoost;
    
    varying float vElevation;

    void main() {
      // 1. Make the particle a circle with a soft edge (foggy look)
      // gl_PointCoord is the UV coordinate of the individual particle
      float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
      float strength = 0.05 / distanceToCenter - 0.1; // Glow effect formula

      // Clip edges to make it a circle
      // functionality similar to opacity, discarding pixels outside the glow
      if(strength < 0.0) discard;

      // 2. Mix Colors based on Elevation
      // We normalize the elevation to a 0.0 - 1.0 range for mixing
      float mixStrength = (vElevation + 0.25) * 1.5;
      vec3 color = mix(uColorStart, uColorEnd, mixStrength);

      // 3. Apply Alpha Boost
      // In light mode, we multiply by a higher number to make the "smoke" thicker
      gl_FragColor = vec4(color, strength * uAlphaBoost);
    }
  `;

// Initial material setup (Default values before hydration)
const WaveShaderMaterial = shaderMaterial(
  // Uniforms: Variables passed from React to the GPU
  {
    uTimeOffset: 0,
    uColorStart: new THREE.Color(defaultLushColour), // Lush-500
    uColorEnd: new THREE.Color(defaultBreezeColour), // Breeze-500
    uPixelRatio: 1, // Will be set on mount
    uAlphaBoost: defaultAlphaBoost, // Amount that the alpha of the particles is boosted by to make "smoke" thicker
    uWaveSpeed: defaultWaveSpeed,
    uWaveElevation: defaultWaveElevation,
    uWaveFrequency: defaultWaveFrequency,
    uMouseClick: new THREE.Vector2(-10, -10), // Start off-screen
    uLastClickTime: -10.0,
  },
  vertexShader,
  fragmentShader,
);

// Allow React-Three-Fiber to use the custom material as <waveShaderMaterial />
extend({ WaveShaderMaterial });

type WaveParticlesProps = {
  /**
   * True when this scene only ever gets a single frame (reduced motion - see
   * the frameloop in OceanScene). Every easing factor collapses to 1 so that
   * one frame lands on the final colour/physics values instead of 5% of the
   * way there.
   */
  snap: boolean;
};

const WaveParticles = ({ snap }: WaveParticlesProps) => {
  const materialRef = useRef<OceanParticleType>(null);

  const { resolvedTheme } = useResolvedTheme();

  // Ref to track the accumulated time offset manually, since math for particle positions depends on time
  // Using time offset instead of time helps trasition dark vs light mode
  // Without it, dark->light moves the "waves" backwards, which looks weird
  const timeOffsetRef = useRef(0);

  // State to control blending mode
  const [blendingMode, setBlendingMode] = useState<THREE.Blending>(
    THREE.AdditiveBlending,
  );

  // Resolved once at mount rather than through useMediaQuery: changing this
  // later would rebuild the entire vertex buffer, and OceanScene is loaded
  // client-only (see the dynamic import on the home page) so there's no
  // hydration mismatch to dodge by starting from a default.
  const [segments] = useState<[number, number]>(() =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
      ? MOBILE_SEGMENTS
      : DESKTOP_SEGMENTS,
  );

  // Initialize targets with defaults
  const targetStart = useRef(new THREE.Color(defaultLushColour));
  const targetEnd = useRef(new THREE.Color(defaultBreezeColour));
  const targetBg = useRef<THREE.Color | null>(null);
  const targetAlphaBoost = useRef(defaultAlphaBoost);

  // Physics Refs (Current Target Values)
  const targetSpeed = useRef(defaultWaveSpeed);
  const targetElevation = useRef(defaultWaveElevation);
  const targetFrequency = useRef(defaultWaveFrequency);

  /**
   * A mirror of where the lerp below has actually got to, kept because the
   * material it lives on doesn't survive a theme switch.
   *
   * Everything the easing builds up - the current elevation, speed, colours,
   * alpha - is stored as uniforms *on the material instance*, and the
   * material is keyed on blendingMode (see the note on it further down), so
   * every light/dark toggle throws that instance away and builds a fresh one
   * back at the shaderMaterial() defaults.
   *
   * Those defaults are the dark-mode settings, near enough. In dark mode the
   * reset barely shows. In light mode it drops elevation 0.9 -> 0.6 and
   * alpha boost 4.0 -> 1.5, which is exactly the "waves went small and thin"
   * state - and getting back out of it takes a hundred-odd frames of lerp,
   * which only happens if frames are running. Toggle the theme while the
   * hero is scrolled away and frameloop is 'never', so none are.
   *
   * Mirroring the values here and writing them back onto the replacement
   * makes the swap lossless: the new material picks up exactly where the old
   * one left off, the easing continues toward whatever the new theme's
   * targets are, and there's no defaults to be stranded on.
   */
  const liveRef = useRef({
    speed: defaultWaveSpeed,
    elevation: defaultWaveElevation,
    frequency: defaultWaveFrequency,
    alphaBoost: defaultAlphaBoost,
    colorStart: new THREE.Color(defaultLushColour),
    colorEnd: new THREE.Color(defaultBreezeColour),
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (materialRef.current) {
      // Set the center of the ripple to the clicked 3D point
      // event.point is the Vector3 {x, y, z} where the ray hit the plane
      materialRef.current.uMouseClick.set(event.point.x, event.point.z);
      materialRef.current.uLastClickTime = timeOffsetRef.current;
    }
  };

  // Updated colours when theme changes.
  useEffect(() => {
    targetStart.current = getCssColorAsThreeColor(
      '--shader-lush',
      defaultLushColour,
    );
    targetEnd.current = getCssColorAsThreeColor(
      '--shader-breeze',
      defaultBreezeColour,
    );
    targetBg.current = getCssColorAsThreeColor('--shader-bg', defaultBgColour);

    const isLightMode = resolvedTheme === 'light';

    // Update Physics Targets based on Theme
    if (isLightMode) {
      // Flowing Water Settings
      targetSpeed.current = 0.55; // Slow movement
      targetElevation.current = 0.9; // Slightly higher waves for more impact at low speed
      targetFrequency.current = 1.0; // waves slightly more spaced out
      targetAlphaBoost.current = 4.0; // more strength for light colour to show, Thick/Vibrant Ink
      setBlendingMode(THREE.NormalBlending); // dark ink, lets the colours show properly
    } else {
      // Electric/Storm Settings
      targetSpeed.current = 0.9; // Fast movement
      targetElevation.current = 0.6; // High peaks
      targetFrequency.current = 1.5; // Tight, chaotic waves
      targetAlphaBoost.current = 1.5; // Soft glow
      setBlendingMode(THREE.AdditiveBlending); // Glowing look
    }

    // Force material update if needed (rarely needed with state, but good for safety)
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }

    // These targets live in refs, so React never re-renders and R3F never
    // learns anything changed. Under frameloop='demand' that would strand a
    // theme switch on the old colours - ask for the one frame that applies
    // them. A no-op under 'always'.
    invalidate();
  }, [resolvedTheme]);

  // Hook to animate the uTime uniform every frame
  useFrame((state, delta) => {
    if (materialRef.current) {
      const mat = materialRef.current;

      // When only one frame is coming, every easing factor has to be 1 or the
      // scene freezes partway to its targets.
      const ease = (current: number, target: number, factor: number) =>
        THREE.MathUtils.lerp(current, target, snap ? 1 : factor);

      // Lerp Physics (slow to let the physics gradually change)
      mat.uWaveSpeed = ease(mat.uWaveSpeed, targetSpeed.current, 0.025);
      mat.uWaveElevation = ease(
        mat.uWaveElevation,
        targetElevation.current,
        0.03,
      );
      mat.uWaveFrequency = ease(
        mat.uWaveFrequency,
        targetFrequency.current,
        0.05,
      );

      // Increment offset by (time_passed * current_speed), with the step
      // capped so a frame that arrives after a long gap can't fling the
      // waves to an unrelated phase — see MAX_FRAME_DELTA.
      timeOffsetRef.current += Math.min(delta, MAX_FRAME_DELTA) * mat.uWaveSpeed;

      // Then fold it back into range, which keeps uTimeOffset small enough
      // that the shader's sin() calls stay precise — see WAVE_TIME_PERIOD.
      // The wrap is invisible because every wave term completes a whole
      // number of cycles across it.
      if (timeOffsetRef.current >= WAVE_TIME_PERIOD) {
        timeOffsetRef.current -= WAVE_TIME_PERIOD;
        // uLastClickTime is measured on this same clock, and the shader reads
        // the difference. Shifting it by the same amount keeps a ripple that
        // happens to be mid-flight from being cut short — or, worse, from
        // going negative and reading as a click that hasn't happened yet.
        mat.uLastClickTime -= WAVE_TIME_PERIOD;
      }

      // Update the shader uniform
      mat.uTimeOffset = timeOffsetRef.current;

      // Smoothly transition colors (Lerp)
      // This prevents the background from snapping instantly when you toggle the theme
      mat.uColorStart.lerp(targetStart.current, snap ? 1 : 0.05);
      mat.uColorEnd.lerp(targetEnd.current, snap ? 1 : 0.05);

      // If the scene is currently transparent (null), snap immediately to the target
      // This prevents a lerp from "black" or "white" -> it just matches the CSS instantly
      if (!state.scene.background && targetBg.current !== null) {
        state.scene.background = targetBg.current.clone();
      } else if (targetBg.current !== null) {
        // If we already have a color, lerp it (handles light/dark mode switches smoothly)
        (state.scene.background as THREE.Color).lerp(
          targetBg.current,
          snap ? 1 : 0.1,
        );
      }

      // Smooth lerp for alpha thickness
      // This allows the particles to "thicken up" smoothly when switching to light mode
      mat.uAlphaBoost = ease(mat.uAlphaBoost, targetAlphaBoost.current, 0.05);

      // Last thing each frame: record where the easing got to, so the next
      // material to be built can start from here rather than from the
      // defaults. See liveRef.
      const live = liveRef.current;
      live.speed = mat.uWaveSpeed;
      live.elevation = mat.uWaveElevation;
      live.frequency = mat.uWaveFrequency;
      live.alphaBoost = mat.uAlphaBoost;
      live.colorStart.copy(mat.uColorStart);
      live.colorEnd.copy(mat.uColorEnd);
    }
  });

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
    mat.uWaveElevation = live.elevation;
    mat.uWaveFrequency = live.frequency;
    mat.uAlphaBoost = live.alphaBoost;
    mat.uColorStart.copy(live.colorStart);
    mat.uColorEnd.copy(live.colorEnd);

    invalidate();
  }, [blendingMode]);

  // The ratio the renderer is *actually* drawing at, not the screen's.
  //
  // These have to be the same number. gl_PointSize is `6.0 * uPixelRatio`, so
  // this scales the width of every point sprite, while the canvas resolution
  // is set by the Canvas's `dpr` — which is clamped to 2. Reading
  // window.devicePixelRatio here meant a DPR-3 phone (an iPhone Pro, plenty
  // of Androids) drew a 2x buffer with points sized for 3x: ~2.25x the
  // fragments per particle, every one of them additively blended with
  // depthWrite off. That's the scene's most overdrawn pass, paid at over
  // twice its intended cost, on exactly the devices with the least fill rate
  // to spare.
  //
  // viewport.dpr is R3F's own clamped value, so the two can't drift apart
  // again, and it re-renders if it ever changes (a drag to another monitor).
  const pixelRatio = useThree((state) => state.viewport.dpr);

  return (
    <>
      {/* Points is the Three.js object for particle systems */}
      <points rotation={[-Math.PI / 2, 0, 0]}>
        {/* Rotate to lay flat like an ocean */}
        {/* PlaneGeometry creates a grid of vertices. 
        args: [width, height, segmentsX, segmentsY] 
        Higher segments = more particles = denser fog/waves
      */}
        <planeGeometry args={[12, 12, segments[0], segments[1]]} />
        <waveShaderMaterial
          ref={materialRef}
          key={blendingMode} // Forces re-rendering since Three.js doesn't like to swap blending modes
          transparent={true}
          depthWrite={false} // Prevents particles from occluding each other weirdly
          blending={blendingMode} // dynamically changes based on light or dark mode
          uPixelRatio={pixelRatio}
        />
      </points>

      {/* THE HITBOX (Low Poly) 
        - Invisible (visible={false})
        - Extremely simple geometry (args={[12, 12, 1, 1]}) = 2 triangles
        - Handles the click instantly and updates the shader ref
      */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handlePointerDown}
      >
        <planeGeometry args={[12, 12, 1, 1]} />
        {/* We need a material for raycasting to work, even if invisible. 
            meshBasicMaterial is the cheapest option. */}
        <meshBasicMaterial />
      </mesh>
    </>
  );
};

/**
 * Keeps the ocean recoverable when the browser takes its WebGL context away.
 *
 * A lost context isn't exotic on a page like this one. Contexts are a limited
 * driver-level resource, and a browser will drop one under GPU memory
 * pressure, when the GPU process restarts, or when something recreates the
 * rendering surface underneath it - switching into DevTools device emulation
 * does exactly that.
 *
 * What makes it *permanent* is the default behaviour of the event: unless
 * something calls preventDefault() on `webglcontextlost`, the browser never
 * fires `webglcontextrestored`, and the canvas keeps showing whatever frame
 * it died on. That's the failure this fixes - not the loss itself, which is
 * the browser's call, but the part where nothing ever comes back and no
 * amount of scrolling, resizing or theme switching clears it.
 *
 * three.js already knows how to rebuild its GL state once a context returns;
 * it just never got the chance. The only thing it needs on top is a frame to
 * draw - `frameloop` here can be 'never' (scrolled past) or 'demand' (reduced
 * motion), and in neither case would anything think to ask.
 */
function WebGLContextGuard() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (event: Event) => event.preventDefault();
    const onRestored = () => invalidate();

    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  return null;
}

// The Main Scene Component
export const OceanScene = () => {
  // State to track when the scene is ready to be shown. Fixes issue where particles took milliseconds to load and appeared abruptly on screen, looks much smoother
  const [isReady, setIsReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const onScreen = useIsOnScreen(containerRef);
  const prefersReducedMotion = usePrefersReducedMotion();

  // The loop itself has to stop - returning early from useFrame would not have
  // helped, because R3F still calls gl.render() every tick and drawing tens of
  // thousands of additively blended points *is* the cost.
  //
  //   never  - scrolled past, or the tab is backgrounded: no frames at all
  //   demand - reduced motion: one static frame, no ongoing animation
  //   always - visible, and motion is welcome: the ocean as designed
  const frameloop = !onScreen
    ? 'never'
    : prefersReducedMotion
      ? 'demand'
      : 'always';

  // Ask for a frame the moment the scene is eligible for one again.
  //
  // Coming back from 'never' is the only transition where nothing else would:
  // whatever happened while the loop was stopped - a theme switch, most
  // likely - left the scene needing to be redrawn, and 'never' means no frame
  // was ever taken to show it. Under 'always' this is a no-op, and under
  // 'demand' it's the one request that gets reduced-motion users their
  // updated frame.
  useEffect(() => {
    if (onScreen) invalidate();
  }, [onScreen]);

  return (
    <div
      ref={containerRef}
      // Slowly pops into display once the Canvas is ready
      className={cn(
        'h-full w-full transition-opacity duration-1000 ease-in-out',
        isReady ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Canvas
        className='touch-pan-y select-none'
        camera={{ position: [0, 2, 4], fov: 60 }}
        gl={{ alpha: true }} // allows empty background
        // Stated rather than inherited, and stated because something else
        // depends on it: WaveParticles sizes its points off this exact value
        // (see the note by pixelRatio there). It's also what SparkleField and
        // Sunrise already pass, so all three canvases agree.
        dpr={[1, 2]}
        frameloop={frameloop}
        onCreated={() => setIsReady(true)}
      >
        <WebGLContextGuard />

        {/* OrbitControls lets you rotate the view with mouse */}
        <Suspense fallback={null}>
          <OrbitControls
            enableZoom={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
        <WaveParticles snap={prefersReducedMotion} />
      </Canvas>
    </div>
  );
};
