'use client';

/**
 * Modifying this file:
 * * movingUv.y -= uTime * _   --> increase _ to make it move faster
 * * snoise(movingUv * _);     --> increase _ to make the waves tighter/smaller
 * * smoothstep(_1, _2, electricity)    --> _1 and _2 define how the colour transitions from the dark background to the bright waves. a tighter gap, like 0.9,0.95 makes sharper, thinner lines
 * * float electricity = sin(combinedNoise * _)   --> increase _ to add more lines
 */

import React, { useEffect, useRef } from 'react';

import { Plane, shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { getCssColorAsThreeColor } from '@/lib/threeJsUtils';

type ElectricMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uColorLush: THREE.Color;
  uColorBreeze: THREE.Color;
  uColorBg: THREE.Color;
};

// --- THE GLSL SHADER CODE ---

// Vertex Shader: The simplest part. It just tells the GPU where the corners of the plane are.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader: Where the magic happens. This calculates the color of every single pixel.
const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColorLush;
  uniform vec3 uColorBreeze;
  uniform vec3 uColorBg;
  varying vec2 vUv;

  // --- Noise Functions (Standard Simplex Noise) ---
  // These are mathematical functions used to generate smooth, natural-looking randomness.
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  // ----------------------------------------------

  void main() {
    // 1. Setup movement
    // We create a coordinate system that moves upwards over time.
    vec2 movingUv = vUv;
    movingUv.y -= uTime * 0.05; // Speed of scroll

    // 2. Generate Base Noise (The Fog/Wave shape)
    // We generate noise at a large scale to create the main "bands" of energy passing by.
    float baseNoise = snoise(movingUv * 5.0);

    // 3. Generate "Electric" Detail Noise
    // We generate much finer noise, moving slightly differently, to create internal jitter.
    float detailNoise = snoise((movingUv + vec2(uTime * 0.1, 0.0)) * 10.0);

    // 4. Combine and create sharp "lightning" edges.
    // The Future Shock look relies on sharp glowing lines.
    // We combine the noise layers.
    float combinedNoise = baseNoise + detailNoise * 0.3;

    // This is the key technique for electricity: '1.0 / abs(noise)'
    // As noise approaches 0, the result shoots to infinity (very bright).
    // We wrap it in 'sin' to create repeating bands, then sharpen it.
    float electricity = sin(combinedNoise * 15.0);
    electricity = smoothstep(0.9, 0.95, electricity); // Crunch the values to make sharp lines

    // 5. Coloring
    // We mix the Lush and Breeze colors based on the detail noise for variation.
    vec3 electricColor = mix(uColorBreeze, uColorLush, detailNoise * 0.5 + 0.5);

    // Final composition: Mix background with electric color based on intensity.
    // Add a base glow (baseNoise * 0.1) so it's never totally black.
    vec3 finalColor = mix(uColorBg, electricColor, electricity + (baseNoise * 0.1));
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Initial material setup (Default values before hydration)
const ElectricMaterial = shaderMaterial(
  {
    uTime: 0,
    // Convert css RGB (0-255) to GLSL RGB (0.0 - 1.0)
    uColorLush: new THREE.Color('#00d1b2'),
    uColorBreeze: new THREE.Color('#09adee'),
    // Using a very dark version of Nebula for the deep background fog
    uColorBg: new THREE.Color('#140a32'),
  },
  vertexShader,
  fragmentShader,
);

// Make the material available as a JSX element (<electricMaterial />)
extend({ ElectricMaterial });

// The internal component that holds the plane and updates the shader
const Scene = () => {
  const materialRef = useRef<ElectricMaterialType>(null);
  const { resolvedTheme } = useResolvedTheme();

  // Initialize targets with defaults
  const targetBg = useRef(new THREE.Color('#140a32'));
  const targetLush = useRef(new THREE.Color('#00d1b0'));
  const targetBreeze = useRef(new THREE.Color('#09acee'));

  // Updated colours when theme changes.
  useEffect(() => {
    targetLush.current = getCssColorAsThreeColor('--shader-lush', '#00d1b0');
    targetBreeze.current = getCssColorAsThreeColor(
      '--shader-breeze',
      '#09acee',
    );
    targetBg.current = getCssColorAsThreeColor('--shader-bg', '#140a32');
  }, [resolvedTheme]);

  // This hook runs on every single frame (usually 60fps)
  useFrame(({ clock }) => {
    if (materialRef.current) {
      // Update the time uniform to animate the shader
      materialRef.current.uTime = clock.getElapsedTime();

      // Smoothly transition colors (Lerp)
      // This prevents the background from snapping instantly when you toggle the theme
      materialRef.current.uColorBg.lerp(targetBg.current, 0.05);
      materialRef.current.uColorLush.lerp(targetLush.current, 0.05);
      materialRef.current.uColorBreeze.lerp(targetBreeze.current, 0.05);
    }
  });

  return (
    // A simple plane that fills the camera view
    <Plane args={[10, 10]}>
      {/* Use our custom material generated above */}
      <electricMaterial ref={materialRef} />
    </Plane>
  );
};

// The main exportable component
export const ElectricShockBackground = () => {
  return (
    <Canvas camera={{ position: [0, 0, 1] }}>
      <Scene />
    </Canvas>
  );
};
