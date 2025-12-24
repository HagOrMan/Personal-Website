import * as THREE from 'three';

/**
 * Reads a CSS variable from the root document and converts it to a THREE.Color.
 * Robustly handles:
 * - Tailwind v4 RGB numbers: "0 209 176"
 * - Tailwind v4 HSL numbers: "190 50% 5%"
 * - Legacy HSL/RGB strings: "hsl(190, 50%, 5%)"
 * - Hex: "#ffffff"
 */
export const getCssColorAsThreeColor = (
  variableName: string,
  fallbackHex: string,
): THREE.Color => {
  if (typeof window === 'undefined') return new THREE.Color(fallbackHex);

  const style = getComputedStyle(document.documentElement);
  const value = style.getPropertyValue(variableName).trim();

  if (!value) return new THREE.Color(fallbackHex);

  const color = new THREE.Color();

  // Handle HSL space-separated values (e.g., "190 50% 5%")
  if (value.includes('%')) {
    const cleanValue = value.replace(/hsl\(|\)|deg|,/g, '').trim();
    const parts = cleanValue.split(/\s+/).map(parseFloat);

    if (parts.length === 3) {
      color.setHSL(parts[0] / 360, parts[1] / 100, parts[2] / 100);

      // CRITICAL FIX: Convert from CSS (sRGB) to Three.js (Linear)
      // This darkens the color so the renderer's gamma correction brings it back to normal.
      color.convertSRGBToLinear();

      return color;
    }
  }

  // Handle RGB space-separated values (e.g., "0 209 176")
  if (/^[\d.]+(\s+[\d.]+)+$/.test(value)) {
    const [r, g, b] = value.split(/\s+/).map(Number);
    color.setRGB(r / 255, g / 255, b / 255);

    // CRITICAL FIX: Convert from CSS (sRGB) to Three.js (Linear)
    color.convertSRGBToLinear();

    return color;
  }

  // 3. Handle standard formats (Hex, standard rgb(), standard hsl())
  color.set(value);
  // Note: Standard hex strings like "#ffffff" are usually assumed sRGB in Three.js,
  // so we should convert them too if R3F color management is on.
  color.convertSRGBToLinear();

  return color;
};
