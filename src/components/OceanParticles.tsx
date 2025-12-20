'use client';

import React, { useEffect, useRef, useState } from 'react';

import { OrbitControls, shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { getCssColorAsThreeColor } from '@/lib/threeJsUtils';

const defaultLushColour = 'rgb(0, 209, 176)';
const defaultBreezeColour = 'rgb(9, 172, 238)';
const defaultBgColour = '#5c7e8a';
const defaultAlphaBoost = 1.5;
// Default Physics (Dark Mode / Electric defaults)
const defaultWaveSpeed = 0.75;
const defaultWaveElevation = 0.6;
const defaultWaveFrequency = 1.5;

type OceanParticleType = THREE.ShaderMaterial & {
  uTime: number;
  uColorStart: THREE.Color;
  uColorEnd: THREE.Color;
  uPixelRatio: number;
  uAlphaBoost: number;
  uWaveSpeed: number;
  uWaveElevation: number;
  uWaveFrequency: number;
};

// Vertex Shader: Calculates position and movement
const vertexShader = `
    uniform float uTime;
    uniform float uPixelRatio;

    uniform float uWaveSpeed;
    uniform float uWaveElevation;
    uniform float uWaveFrequency;
    
    varying float vElevation; // Pass wave height to fragment shader for coloring

    // A simple pseudo-random function for extra "fog" noise if needed
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);

      // --- WAVE LOGIC ---
      // We combine two Sine waves to make the movement look more organic/oceanic
      // Wave 1 (Big swells)
      float elevation = sin(modelPosition.x * uWaveFrequency + uTime * uWaveSpeed) 
                      * sin(modelPosition.z * (uWaveFrequency * 0.8) + uTime * (uWaveSpeed * 0.8)) 
                      * uWaveElevation;
      
      // Secondary ripples
      elevation -= abs(sin(modelPosition.x * (uWaveFrequency * 2.5) + uTime * (uWaveSpeed * 2.0)) * 0.1);

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
    uTime: 0,
    uColorStart: new THREE.Color(defaultLushColour), // Lush-500
    uColorEnd: new THREE.Color(defaultBreezeColour), // Breeze-500
    uPixelRatio: 1, // Will be set on mount
    uAlphaBoost: defaultAlphaBoost, // Amount that the alpha of the particles is boosted by to make "smoke" thicker
    uWaveSpeed: defaultWaveSpeed,
    uWaveElevation: defaultWaveElevation,
    uWaveFrequency: defaultWaveFrequency,
  },
  vertexShader,
  fragmentShader,
);

// Allow React-Three-Fiber to use the custom material as <waveShaderMaterial />
extend({ WaveShaderMaterial });

const WaveParticles = () => {
  const materialRef = useRef<OceanParticleType>(null);

  const { resolvedTheme } = useResolvedTheme();

  // State to control blending mode
  const [blendingMode, setBlendingMode] = useState<THREE.Blending>(
    THREE.AdditiveBlending,
  );

  // Initialize targets with defaults
  const targetStart = useRef(new THREE.Color(defaultLushColour));
  const targetEnd = useRef(new THREE.Color(defaultBreezeColour));
  const targetBg = useRef(new THREE.Color(defaultBgColour));
  const targetAlphaBoost = useRef(defaultAlphaBoost);

  // Physics Refs (Current Target Values)
  const targetSpeed = useRef(defaultWaveSpeed);
  const targetElevation = useRef(defaultWaveElevation);
  const targetFrequency = useRef(defaultWaveFrequency);

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
      targetSpeed.current = 0.6; // Slow movement
      targetElevation.current = 0.8; // Slightly higher waves for more impact at low speed
      targetFrequency.current = 1.0; // waves slightly more spaced out
      targetAlphaBoost.current = 4.0; // more strength for light colour to show, Thick/Vibrant Ink
      setBlendingMode(THREE.NormalBlending); // dark ink/smoke
    } else {
      // Electric/Storm Settings
      targetSpeed.current = 0.8; // Fast movement
      targetElevation.current = 0.6; // High peaks
      targetFrequency.current = 1.5; // Tight, chaotic waves
      targetAlphaBoost.current = 1.5; // Soft glow
      setBlendingMode(THREE.AdditiveBlending); // Glowing look
    }

    // Force material update if needed (rarely needed with state, but good for safety)
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [resolvedTheme]);

  // Hook to animate the uTime uniform every frame
  useFrame((state) => {
    // Animate the Scene Background (The void behind the particles)
    // We check if the background is a Color object; if not, we initialize it.
    if (
      !state.scene.background ||
      !(state.scene.background instanceof THREE.Color)
    ) {
      state.scene.background = new THREE.Color(defaultBgColour);
    }

    if (materialRef.current) {
      const mat = materialRef.current;
      mat.uTime = state.clock.getElapsedTime();

      // Smoothly transition colors (Lerp)
      // This prevents the background from snapping instantly when you toggle the theme
      mat.uColorStart.lerp(targetStart.current, 0.05);
      mat.uColorEnd.lerp(targetEnd.current, 0.05);
      // Smoothly transition the background color
      (state.scene.background as THREE.Color).lerp(targetBg.current, 0.05);

      // Smooth lerp for alpha thickness
      // This allows the particles to "thicken up" smoothly when switching to light mode
      mat.uAlphaBoost = THREE.MathUtils.lerp(
        mat.uAlphaBoost,
        targetAlphaBoost.current,
        0.05,
      );

      // Lerp Physics (slow to let the physics gradually change)
      mat.uWaveSpeed = THREE.MathUtils.lerp(
        mat.uWaveSpeed,
        targetSpeed.current,
        0.03,
      );
      mat.uWaveElevation = THREE.MathUtils.lerp(
        mat.uWaveElevation,
        targetElevation.current,
        0.03,
      );
      mat.uWaveFrequency = THREE.MathUtils.lerp(
        mat.uWaveFrequency,
        targetFrequency.current,
        0.03,
      );
    }
  });

  // Calculate pixel ratio for sharp rendering on all screens
  const pixelRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  return (
    // Points is the Three.js object for particle systems
    <points rotation={[-Math.PI / 2, 0, 0]}>
      {/* Rotate to lay flat like an ocean */}
      {/* PlaneGeometry creates a grid of vertices. 
        args: [width, height, segmentsX, segmentsY] 
        Higher segments = more particles = denser fog/waves
      */}
      <planeGeometry args={[12, 12, 256, 128]} />
      <waveShaderMaterial
        ref={materialRef}
        key={blendingMode} // Forces re-rendering since Three.js doesn't like to swap blending modes
        transparent={true}
        depthWrite={false} // Prevents particles from occluding each other weirdly
        blending={blendingMode} // dynamically changes based on light or dark mode
        uPixelRatio={pixelRatio}
      />
    </points>
  );
};

// The Main Scene Component
export const OceanScene = () => {
  return (
    <Canvas camera={{ position: [0, 2, 4], fov: 60 }}>
      {/* OrbitControls lets you rotate the view with mouse */}
      <OrbitControls
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.2}
      />
      <WaveParticles />
    </Canvas>
  );
};
