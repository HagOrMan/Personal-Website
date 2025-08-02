import React from 'react';

import { cn } from '@/lib/utils';

export type GradientStop = {
  colour?: string; // Tailwind colour name (e.g., 'lush-500') or 'transparent'
  opacity?: number; // 0-1 for opacity when using Tailwind colours (is in `style` which is why it's a decimal like 0.5 rather than 50 as seen in className)
  position: number; // 0-100 for percentage position that this colour appears at
};

// Default gradient stops if not provided
export const defaultHaloRingStops: GradientStop[] = [
  { colour: 'transparent', position: 50 },
  { colour: 'lush-500', opacity: 0.5, position: 60 },
  { colour: 'lush-500', opacity: 0.2, position: 80 },
  { colour: 'transparent', position: 90 },
];

type HaloRingHoverProps = {
  children: React.ReactNode;
  haloColour?: string;
  size?: string;
  transitionDuration?: string;
  className?: string;

  // Advanced gradient customization
  gradientStops?: GradientStop[];
};

/**
 * Creates a tapering halo effect around its children on hover. Many customizations are available.
 *
 * @param {React.ReactNode} props.children - The content to be wrapped by the halo.
 * @param {string} [props.haloColour] - The base Tailwind CSS color name for the halo. Overridden if gradientStops is passed in. Affects the defaultHaloRingStops otherwise, replacing `lush-500`
 * @param {string} [props.size="150%"] - The size of the halo relative to the child.
 * @param {string} [props.transitionDuration="0.5s"] - The duration of the hover transition.
 * @param {Array<GradientStop>} [props.gradientStops] - Optional gradient stop customization to choose which colours are used and where they appear in the gradient. Check out `defaultHaloRingStops` to see the format.
 * @param {string} [props.className=""] - Optional extra classes for the container.
 */
export function HaloRingHover({
  children,
  haloColour,
  size = '150%',
  transitionDuration = '0.5s',
  gradientStops,
  className = '',
}: HaloRingHoverProps) {
  // Create a halo gradient based on the gradient stops if passed in. If not, creates a similar structure to the default if halo colour is passed. If neither are passed, uses the default
  const haloGradientStops =
    gradientStops ||
    (haloColour !== undefined
      ? ([
          { colour: 'transparent', position: 50 },
          { colour: haloColour, opacity: 0.5, position: 60 },
          { colour: haloColour, opacity: 0.2, position: 80 },
          { colour: 'transparent', position: 90 },
        ] as GradientStop[])
      : defaultHaloRingStops);

  // Generate gradient string
  const generateGradientString = (stops: GradientStop[]) => {
    const gradientParts = stops.map((stop) => {
      if (stop.colour === 'transparent') {
        return `transparent ${stop.position}%`;
      } else {
        const opacity = stop.opacity !== undefined ? ` / ${stop.opacity}` : '';
        return `rgb(var(--tw-color-${stop.colour})${opacity}) ${stop.position}%`;
      }
    });

    return `radial-gradient(circle, ${gradientParts.join(', ')})`;
  };

  return (
    <div className={cn('group relative inline-flex', className)}>
      <div className='z-10'>{children}</div>
      <div
        className='pointer-events-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 scale-75 rounded-full opacity-0 transition-all ease-out group-hover:scale-100 group-hover:opacity-100'
        style={{
          width: size,
          height: size,
          background: generateGradientString(haloGradientStops),
          transitionDuration: transitionDuration,
        }}
      />
    </div>
  );
}
