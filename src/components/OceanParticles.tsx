'use client';

import React, { useRef } from 'react';

import { OrbitControls, shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type OceanParticleType = THREE.ShaderMaterial & {
  uTime: number;
  uColorStart: THREE.Color;
  uColorEnd: THREE.Color;
  uPixelRatio: number;
};

// 1. Define the Custom Shader Material
// This handles the math for the waves (vertex) and the look of the particles (fragment)
const WaveShaderMaterial = shaderMaterial(
  // Uniforms: Variables passed from React to the GPU
  {
    uTime: 0,
    uColorStart: new THREE.Color('rgb(0, 209, 176)'), // Lush-500
    uColorEnd: new THREE.Color('rgb(9, 172, 238)'), // Breeze-500
    uPixelRatio: 1, // Will be set on mount
  },
  // Vertex Shader: Calculates position and movement
  `
    uniform float uTime;
    uniform float uPixelRatio;
    
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
      float elevation = sin(modelPosition.x * 1.5 + uTime * 0.8) 
                      * sin(modelPosition.z * 1.0 + uTime * 0.6) * 0.5;
      
      // Wave 2 (Smaller ripples)
      elevation -= abs(sin(modelPosition.x * 4.0 + uTime * 1.5) * 0.1);

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
  `,
  // Fragment Shader: Calculates color and shape of each particle
  `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    
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

      gl_FragColor = vec4(color, strength); 
    }
  `,
);

// Allow React-Three-Fiber to use the custom material as <waveShaderMaterial />
extend({ WaveShaderMaterial });

const WaveParticles = () => {
  const materialRef = useRef<OceanParticleType>(null);

  // Hook to animate the uTime uniform every frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime();
    }
  });

  // Calculate pixel ratio for sharp rendering on all screens
  const pixelRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  return (
    // Points is the Three.js object for particle systems
    <points rotation={[-Math.PI / 2, 0, 0]}>
      {' '}
      {/* Rotate to lay flat like an ocean */}
      {/* PlaneGeometry creates a grid of vertices. 
        args: [width, height, segmentsX, segmentsY] 
        Higher segments = more particles = denser fog/waves
      */}
      <planeGeometry args={[12, 12, 128, 128]} />
      <waveShaderMaterial
        ref={materialRef}
        transparent={true}
        depthWrite={false} // Prevents particles from occluding each other weirdly
        blending={THREE.AdditiveBlending} // Makes overlapping particles glow brighter
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
