'use client';

import React, { useEffect, useRef, useState } from 'react';

import { shaderMaterial } from '@react-three/drei';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useResolvedTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * My notes on what this scene was supposed to be represented by:
 * - waves rolling from the top right to bottom left. Waves are in a pattern where it is like a grid, except every even column is moved down slightly so that its waves appear halfway between their row and the next row. Thus, each wave has a short length, and there are waves around it to its right and left slightly above it and slightly below it, in addition to waves directly behind and ahead that are a full length away. the waves roll slowly, are not very high, but are plentiful
 * - waves are a light blue, and a shine appears from the top left and fades about halfway to the bottom right. the shine is very light, coming from a sun that i think i also want to appear on the animation
 * - on the horizon line, there is a similar brightness that matches the sun brightness which goes slgihtly above teh horizon. this brightness has a tint to it. in light mode, I'm thinking orange. In dark mode, i think a purple with the nebula would look good. the brightness on the horizon fades into another blue, of similar shade to the water, but more matte. in front of that tint is a dark spot for clouds. they're lifted slightly off the water and don't go all the way up to the beginning of the transition of the horizon to blue, but add a little darkness as a separator
 * - the ocean blue is more reflective as a colour while the sky is similar but more dull or matte
 */

/*
 * ==========================================================================
 * TUNING GUIDE — the main dials, all marked inline with "TWEAK:" comments
 * ==========================================================================
 *
 * FOG (water fragment shader)
 *   - FOG_NEAR / FOG_FAR (smoothstep(25.0, 32.0, depth)):
 *       World-z depths (in units in front of the camera) where fog starts
 *       and where it's fully opaque. Lower both -> fog line moves closer to
 *       the camera. Widen the gap -> softer, more gradual dissolve; narrow
 *       it -> a crisper fog edge. Keep FOG_FAR comfortably smaller than the
 *       plane's far extent (plane centre z=-14, half-depth 24 -> far edge
 *       around z=-38, i.e. depth ~42.8 from the camera) so geometry never
 *       peeks past the fog.
 *
 * WAVES (water vertex shader, the gerstner(...) calls)
 *   - Each wave is vec4(dir.x, dir.y, steepness, wavelength).
 *       dir.x/dir.y: travel direction on the xz plane (normalised in-shader).
 *       steepness (0..~0.3 here): how pinched/sharp the crests are. Sum of
 *         all steepness values should stay below ~1.0 or crests fold over
 *         themselves (loops in the surface).
 *       wavelength: crest-to-crest distance in world units. Bigger = long
 *         rolling swells; smaller = choppy ripples.
 *   - Add or remove gerstner() lines to layer more/less detail. If you
 *     change amplitudes, also revisit the vCrest normaliser (disp.y / 0.28)
 *     so the subsurface glow still maps 0..1 sensibly.
 *
 * SUN / LIGHTING
 *   - SUN_DIR (top of file): direction toward the sun; drives the water's
 *     diffuse, specular, and subsurface response. Keep y small for a
 *     low-sun look.
 *   - uSunPos (SkyMaterial defaults): where the sun DISC is drawn on the
 *     backdrop, in 0..1 screen uv. Move this together with SUN_DIR and the
 *     shineOrigin so the light and the disc agree.
 *   - shineOrigin (water fragment): world xz point the shimmer radiates
 *     from. exp(-shineDist * 0.05): raise 0.05 to shrink the shimmer's
 *     reach, lower it to spread the sheen across more water.
 *   - spec exponent (pow(..., 260.0)): higher = tighter, sharper glints;
 *     lower = broad soft highlight.
 *
 * COLOURS
 *   - lightPalette / darkPalette: every colour in the scene. The useFrame
 *     lerp (k = 0.06) is the crossfade speed on theme change — raise for a
 *     snappier switch, lower for a slower melt.
 *
 * SKY (sky fragment shader)
 *   - band exp(-skyT*skyT*7.0): 7.0 = glow height; higher pins the glow
 *     tighter to the horizon.
 *   - core smoothstep(0.055, 0.0, sd): sun disc radius. halo exp(-sd*6.5):
 *     halo falloff (higher = tighter halo).
 *   - cloudCenter H + 0.032 and /0.026: cloud band height above the
 *     horizon and its thickness.
 *
 * CAMERA / FRAMING (Canvas props + water mesh)
 *   - camera position [0, 3.2, 4.8] and lookAt(0, -1.0, -10): height and
 *     downward tilt. fov 55: wider fov = more water in frame.
 *   - Water plane args [110, 48, 560, 280]: width, depth, and segment
 *     counts. More segments = smoother crests, more GPU cost.
 *   - speed prop (default 0.6): global animation rate.
 */

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------
type Rgb = [number, number, number];

interface Palette {
  waterDeep: Rgb; // colour of water you look straight into
  waterShallow: Rgb; // lit water at grazing angles (pre-fresnel base)
  scatter: Rgb; // subsurface glow inside backlit crests
  skyTop: Rgb;
  skyHorizon: Rgb; // matte blue the glow fades into
  glow: Rgb; // tinted horizon brightness (orange / nebula)
  sun: Rgb; // sun disc + specular colour
  cloud: Rgb; // dark separator band
}

// TWEAK: every colour in the scene lives in these two palettes.
const lightPalette: Palette = {
  waterDeep: [0, 110, 165], // breeze-700
  waterShallow: [51, 195, 253], // breeze-400
  scatter: [20, 237, 200], // lush-400 — the glow inside crests
  skyTop: [186, 224, 244], // matte, water-adjacent blue
  skyHorizon: [150, 205, 232], // breeze-400 pulled toward grey (matte water blue)
  glow: [255, 186, 120], // sunrise orange
  sun: [255, 240, 214],
  cloud: [96, 130, 160],
};

const darkPalette: Palette = {
  waterDeep: [12, 18, 44], // violet-navy depths (nebula-tinted)
  waterShallow: [56, 86, 166], // blue-violet lit water
  scatter: [130, 132, 255], // nebula-300/400 — purple glow in the crests
  skyTop: [17, 24, 54], // deep night, nudged toward the water's blue
  skyHorizon: [32, 80, 110], // matte take on breeze-700 water
  glow: [112, 115, 255], // nebula-400
  sun: [220, 226, 255], // nebula-100
  cloud: [8, 16, 28],
};

const toColor = ([r, g, b]: Rgb) => new THREE.Color(r / 255, g / 255, b / 255);

// Sun sits low and to the left. Water lighting + sky disc share this idea:
// SUN_DIR is the direction *toward* the sun from the water.
// TWEAK: change x/z to move the light's compass direction; keep y small
// (0.05–0.25) to preserve the low-sun grazing light. If you move this,
// also move uSunPos (sky) and shineOrigin (water) to match.
const SUN_DIR = new THREE.Vector3(-0.62, 0.12, -0.78).normalize();

// ---------------------------------------------------------------------------
// WATER — Gerstner waves + sunrise lighting
// ---------------------------------------------------------------------------
const waterVertexShader = /* glsl */ `
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;   // 0 trough .. 1 crest, drives subsurface glow

  // One Gerstner wave. wave = (dir.x, dir.y, steepness, wavelength)
  // Accumulates analytic tangent/binormal so normals are exact.
  vec3 gerstner(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal, float t) {
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 6.28318 / wavelength;
    float c = sqrt(9.8 / k);              // deep-water phase speed
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, p.xz) - c * t);
    float a = steepness / k;

    float sinf = sin(f);
    float cosf = cos(f);

    tangent += vec3(
      -d.x * d.x * steepness * sinf,
       d.x * steepness * cosf,
      -d.x * d.y * steepness * sinf
    );
    binormal += vec3(
      -d.x * d.y * steepness * sinf,
       d.y * steepness * cosf,
      -d.y * d.y * steepness * sinf
    );
    return vec3(d.x * a * cosf, a * sinf, d.y * a * cosf);
  }

  void main() {
    // Plane is rotated flat, so work in world space from the start.
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 gridPoint = p;

    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);

    // All waves head roughly toward +z (the camera) and -x: i.e. from the
    // top-right of the frame toward the bottom-left. Tight wavelengths,
    // modest steepness = plentiful low waves.
    //
    // TWEAK: each line is vec4(dir.x, dir.y, steepness, wavelength).
    //   - steepness: sharper/pinchier crests. Keep the SUM of all
    //     steepness values < ~1.0 or crests loop over themselves.
    //   - wavelength: bigger = long rolling swell, smaller = chop.
    //   - Add/remove lines to layer more/less wave detail.
    vec3 disp = vec3(0.0);
    disp += gerstner(vec4(-0.35, 1.0, 0.22, 3.4), gridPoint, tangent, binormal, uTime);
    disp += gerstner(vec4(-0.55, 1.0, 0.18, 2.1), gridPoint, tangent, binormal, uTime);
    disp += gerstner(vec4(-0.20, 1.0, 0.16, 1.4), gridPoint, tangent, binormal, uTime);
    disp += gerstner(vec4(-0.70, 0.8, 0.12, 0.9), gridPoint, tangent, binormal, uTime);
    disp += gerstner(vec4(-0.10, 1.0, 0.10, 0.85), gridPoint, tangent, binormal, uTime);

    p += disp;

    vNormal = normalize(cross(binormal, tangent));
    vWorldPos = p;
    // Max possible height ~ sum of amplitudes; normalise crest factor.
    // TWEAK: if you change wave steepness/wavelengths, adjust 0.28 (the
    // rough max displacement) so vCrest still spans 0..1 — this drives
    // where the subsurface glow appears.
    vCrest = clamp(disp.y / 0.28 + 0.5, 0.0, 1.0);

    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uWaterDeep;
  uniform vec3 uWaterShallow;
  uniform vec3 uScatter;
  uniform vec3 uSkyHorizon;
  uniform vec3 uGlow;
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  // Tiny hash noise to break up the specular into sparkle
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 sunDir = normalize(uSunDir);

    // --- Base colour: fresnel between deep water and sky reflection ---
    // TWEAK: the pow(..., 5.0) is the classic Schlick fresnel exponent.
    // Lower it (e.g. 3.0) for more sky reflection overall; the 0.04 floor
    // is how reflective the water is when viewed straight down.
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 5.0);
    fresnel = mix(0.04, 1.0, fresnel);

    // What the surface reflects: matte sky, warmed toward the glow when
    // the reflected ray heads sunward.
    // TWEAK: the pow(..., 3.0) controls how wide the warm-glow region of
    // the reflections is (higher = narrower); 0.85 is its strength.
    vec3 reflDir = reflect(-viewDir, n);
    float towardSun = pow(max(dot(reflDir, sunDir), 0.0), 3.0);
    vec3 skyRefl = mix(uSkyHorizon, uGlow, towardSun * 0.85);

    // Water body colour, lifted slightly on lit faces.
    // TWEAK: 0.55 = how much lit faces brighten toward waterShallow.
    float diffuse = max(dot(n, sunDir), 0.0);
    vec3 body = mix(uWaterDeep, uWaterShallow, diffuse * 0.55);

    vec3 col = mix(body, skyRefl, fresnel);

    // --- Subsurface scattering: light shining INTO the crests ---
    // Strong when you look toward the sun through a raised, thin crest.
    // TWEAK: pow(..., 3.5) = glow tightness (higher = only near-perfect
    // backlight glows); smoothstep(0.45, 1.0, ...) = how high on the wave
    // the glow starts (raise 0.45 to confine it to the very tips);
    // the 1.1 multiplier = overall glow intensity.
    vec3 scatterDir = normalize(-sunDir + n * 0.4);
    float sss = pow(max(dot(viewDir, scatterDir), 0.0), 3.5);
    sss *= smoothstep(0.45, 1.0, vCrest);        // only the thin wave tops
    col += uScatter * sss * 1.1;

    // --- Sun shimmer: a light cast from the top-left of the water ---
    // Instead of a specular trail running toward the viewer, the shine is a
    // quiet shimmer anchored near the sun's corner (left, far) that decays
    // diagonally toward the bottom-right / near side of the frame.
    // TWEAK: shineOrigin = world xz point the shimmer radiates from (move
    // it with the sun). exp(-shineDist * 0.05): raise 0.05 to shrink the
    // shimmer's reach, lower to spread it across more of the water.
    vec2 shineOrigin = vec2(-16.0, -30.0);            // left and far, under the sun
    float shineDist = length(vWorldPos.xz - shineOrigin);
    float shine = exp(-shineDist * 0.05);             // reaches further across the water

    // TWEAK: pow(..., 260.0) = glint tightness (higher = smaller, sharper
    // sparkles). In \`sparkle\`, 14.0 = sparkle grain size on the water and
    // 3.0 = how fast the glints twinkle.
    vec3 h = normalize(sunDir + viewDir);
    float spec = pow(max(dot(n, h), 0.0), 260.0);
    float sparkle = 0.6 + 0.4 * hash(floor(vWorldPos.xz * 14.0) + floor(uTime * 3.0));

    // Kept deliberately understated: glints only where the shimmer reaches,
    // plus a very light broad sheen on lit faces in the same region.
    // TWEAK: 1.1 = glint brightness; (0.10 + diffuse * 0.08) = strength of
    // the soft ambient sheen near the sun's corner.
    col += uSunColor * spec * sparkle * 1.1 * shine;
    col += uSunColor * (0.10 + diffuse * 0.08) * shine; // sheen on flat water too

    // --- Distance fog: dissolve into the horizon colours ---
    // v3 FIX: fog is computed from DEPTH along the camera's view axis
    // (world z, since the camera is locked looking down -z), NOT the
    // radial euclidean distance to the camera. Radial distance forms
    // spherical shells, which read on screen as a circular arc of fog —
    // the far left/right of the frame fogged "closer" than the centre.
    // Depth-based fog is constant along any line parallel to the horizon,
    // so the fog band is now straight, sitting at what used to be its
    // farthest distance, all the way across.
    //
    // TWEAK: FOG_NEAR (25.0) = depth where fog begins; FOG_FAR (32.0) =
    // depth of full fog. Lower both to bring the horizon line closer;
    // widen the gap for a softer dissolve, narrow it for a harder edge.
    // Keep FOG_FAR well under the plane's far edge (~depth 42.8 with the
    // current mesh) so geometry never outruns the fog.
    float depth = cameraPosition.z - vWorldPos.z;   // straight-line depth, not radial
    float fog = smoothstep(25.0, 32.0, depth);
    // TWEAK: 0.30 = baseline warm tint in the fog everywhere; 0.55 and the
    // 0.03 falloff shape how strongly the fog leans toward the glow colour
    // on the sun's side of the horizon.
    float sunward = clamp(0.30 + 0.55 * exp(-shineDist * 0.03), 0.0, 1.0);
    vec3 fogColor = mix(uSkyHorizon, uGlow, sunward);
    col = mix(col, fogColor, fog);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const WaterMaterial = shaderMaterial(
  {
    uTime: 0,
    uSunDir: SUN_DIR.clone(),
    uSunColor: toColor(darkPalette.sun),
    uWaterDeep: toColor(darkPalette.waterDeep),
    uWaterShallow: toColor(darkPalette.waterShallow),
    uScatter: toColor(darkPalette.scatter),
    uSkyHorizon: toColor(darkPalette.skyHorizon),
    uGlow: toColor(darkPalette.glow),
  },
  waterVertexShader,
  waterFragmentShader,
);

// ---------------------------------------------------------------------------
// SKY — clip-space backdrop quad (gradient, glow, sun, clouds)
// ---------------------------------------------------------------------------
const skyVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Push to the far plane so the water always draws in front.
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  varying vec2 vUv;

  uniform float uTime;
  uniform float uAspect;
  uniform float uHorizon;   // screen height of the waterline (approx.)
  uniform vec2  uSunPos;    // sun position in screen uv

  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uGlow;
  uniform vec3 uSun;
  uniform vec3 uCloud;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float H = uHorizon;
    float skyT = clamp((uv.y - H) / max(1.0 - H, 0.001), 0.0, 1.0);
    vec3 col = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 1.0, skyT));

    // Horizon glow, concentrated under the sun, rising slightly then fading.
    // TWEAK: 7.0 = glow height (higher pins the glow tighter to the
    // horizon); 1.4 = how narrowly the glow concentrates under the sun's
    // x position; 0.85 = overall glow strength.
    float band = exp(-skyT * skyT * 7.0);
    float underSun = 0.55 + 0.45 * exp(-pow((uv.x - uSunPos.x) * 1.4, 2.0));
    col = mix(col, uGlow, clamp(band * underSun, 0.0, 1.0) * 0.85);

    // Sun disc + halo — visible but not blinding.
    // TWEAK: 0.055 = disc radius; 6.5 = halo falloff (higher = tighter
    // halo, lower = big hazy corona); 0.45 = halo strength; the final
    // exp(-sd * 14.0) * 0.22 is the hot centre boost.
    vec2 sp = (uv - uSunPos) * vec2(uAspect, 1.0);
    float sd = length(sp);
    float core = smoothstep(0.055, 0.0, sd);
    float halo = exp(-sd * 6.5) * 0.45;
    col = mix(col, uSun, clamp(core + halo, 0.0, 1.0));
    col += uSun * exp(-sd * 14.0) * 0.22; // gentle hot centre

    // Cloud mass: a still, thin, dense band resting on the horizon.
    // No time term — the clouds don't drift.
    // TWEAK: 0.032 = band height above the horizon; 0.026 = band
    // thickness; the smoothstep(0.22, 0.52, ...) window = cloud density
    // (raise 0.22 for wispier, lower for denser); 5.5/3.0 = texture
    // scale; 0.85 = cloud opacity.
    float cloudCenter = H + 0.032;
    float shape = exp(-pow((uv.y - cloudCenter) / 0.026, 2.0));
    float tex = smoothstep(0.22, 0.52, fbm(vec2(uv.x * 5.5, uv.y * 3.0)));
    col = mix(col, uCloud, shape * tex * 0.85);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SkyMaterial = shaderMaterial(
  {
    uTime: 0,
    uAspect: 1,
    uHorizon: 0.7, // TWEAK: screen height (0..1) of the waterline on the backdrop
    uSunPos: new THREE.Vector2(0.14, 0.775), // TWEAK: sun disc position in screen uv — move with SUN_DIR
    uSkyTop: toColor(darkPalette.skyTop),
    uSkyHorizon: toColor(darkPalette.skyHorizon),
    uGlow: toColor(darkPalette.glow),
    uSun: toColor(darkPalette.sun),
    uCloud: toColor(darkPalette.cloud),
  },
  skyVertexShader,
  skyFragmentShader,
);

extend({ WaterMaterial, SkyMaterial });

type WaterMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uSunDir: THREE.Vector3;
  uSunColor: THREE.Color;
  uWaterDeep: THREE.Color;
  uWaterShallow: THREE.Color;
  uScatter: THREE.Color;
  uSkyHorizon: THREE.Color;
  uGlow: THREE.Color;
};

type SkyMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uAspect: number;
  uHorizon: number;
  uSunPos: THREE.Vector2;
  uSkyTop: THREE.Color;
  uSkyHorizon: THREE.Color;
  uGlow: THREE.Color;
  uSun: THREE.Color;
  uCloud: THREE.Color;
};

declare module '@react-three/fiber' {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    waterMaterial: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skyMaterial: any;
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
const SunriseScene = ({ speed }: { speed: number }) => {
  const waterRef = useRef<WaterMaterialType>(null);
  const skyRef = useRef<SkyMaterialType>(null);
  const { resolvedTheme } = useResolvedTheme();

  const timeRef = useRef(0);
  const reducedMotion = useRef(false);

  const targets = useRef<Record<keyof Palette, THREE.Color>>({
    waterDeep: toColor(darkPalette.waterDeep),
    waterShallow: toColor(darkPalette.waterShallow),
    scatter: toColor(darkPalette.scatter),
    skyTop: toColor(darkPalette.skyTop),
    skyHorizon: toColor(darkPalette.skyHorizon),
    glow: toColor(darkPalette.glow),
    sun: toColor(darkPalette.sun),
    cloud: toColor(darkPalette.cloud),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (reducedMotion.current = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const palette = resolvedTheme === 'light' ? lightPalette : darkPalette;
    (Object.keys(palette) as (keyof Palette)[]).forEach((key) => {
      targets.current[key].copy(toColor(palette[key]));
    });
  }, [resolvedTheme]);

  useFrame((state, delta) => {
    const water = waterRef.current;
    const sky = skyRef.current;
    if (!water || !sky) return;

    // TWEAK: 0.12 = how much the animation slows for prefers-reduced-motion.
    timeRef.current += delta * speed * (reducedMotion.current ? 0.12 : 1);
    water.uTime = timeRef.current;
    sky.uTime = timeRef.current;
    sky.uAspect = state.size.width / Math.max(state.size.height, 1);

    // TWEAK: k = theme-crossfade speed (per frame). Raise for a snappier
    // light/dark switch, lower for a slower melt between palettes.
    const k = 0.06;
    const t = targets.current;
    water.uWaterDeep.lerp(t.waterDeep, k);
    water.uWaterShallow.lerp(t.waterShallow, k);
    water.uScatter.lerp(t.scatter, k);
    water.uSkyHorizon.lerp(t.skyHorizon, k);
    water.uGlow.lerp(t.glow, k);
    water.uSunColor.lerp(t.sun, k);
    sky.uSkyTop.lerp(t.skyTop, k);
    sky.uSkyHorizon.lerp(t.skyHorizon, k);
    sky.uGlow.lerp(t.glow, k);
    sky.uSun.lerp(t.sun, k);
    sky.uCloud.lerp(t.cloud, k);
  });

  return (
    <>
      {/* Backdrop sky — clip-space quad pinned to the far plane */}
      <mesh frustumCulled={false} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <skyMaterial ref={skyRef} depthWrite={false} />
      </mesh>

      {/* The ocean. Oversized so its edges sit far outside the frustum even
          on very wide banners — the fog completes (depth 32 from the camera,
          i.e. world z = -27.2) long before the plane's far edge (~z = -38),
          so no geometry edge can ever peek through.
          TWEAK: planeGeometry args = [width, depth, widthSegments,
          depthSegments]. More segments = smoother wave crests but more GPU
          cost. If you push FOG_FAR out, make sure the plane still extends
          past it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -14]}>
        <planeGeometry args={[110, 48, 560, 280]} />
        <waterMaterial ref={waterRef} />
      </mesh>
    </>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface OceanSunriseSceneProps {
  className?: string;
  /** Overall animation speed multiplier. */
  speed?: number;
}

export const OceanSunriseScene = ({
  className,
  speed = 0.6, // TWEAK: global animation speed (waves + sparkle twinkle)
}: OceanSunriseSceneProps) => {
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
        dpr={[1, 2]}
        // Locked, elevated camera: looking well down onto the wave field.
        // TWEAK: position [x, height, z] and fov control the framing;
        // lookAt below sets the downward tilt.
        camera={{ position: [0, 3.2, 4.8], fov: 55 }}
        gl={{ antialias: true }}
        onCreated={({ camera }) => {
          camera.lookAt(0, -1.0, -10); // gaze tilted down onto the water
          setIsReady(true);
        }}
      >
        <SunriseScene speed={speed} />
      </Canvas>
    </div>
  );
};

export default OceanSunriseScene;
