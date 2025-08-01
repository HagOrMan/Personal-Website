import React from 'react';

import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface GradientTextHoverProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Creates a component that has the text on the input children be the foreground originally and animate on hover with a new colour coming in from left to right, fully replacing the black.
 * The colour is currently lush-600, but the default can be mddified by passing in a className.
 * - The passed in className must be a variation of `bg-[linear-gradient(to_right,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]`
 * - `theme(colors.lush.600)` is the colour on hover
 * - `theme(colors.foreground)` is the base colour
 * - Modify either of these in the main style to change the regular/hover colours, or even change `to_right` to change the direction it applies in
 * The `asChild` parameter can be used to have the styles applied to children components of this component rather than text.
 *
 * **Examples:**
 * - **Using regular text:** `<GradientTextHover>Text To Animate On Hover</GradientTextHover>`
 * - **Using a custom component:** `<GradientTextHover><CustomComponent/></GradientTextHover>`
 */
export const GradientTextHover = ({
  asChild,
  children,
  className,
}: GradientTextHoverProps) => {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      aria-hidden='true'
      className={cn(
        'bg-[linear-gradient(to_right,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)] bg-[length:200%_100%] bg-clip-text bg-[position:100%_0] text-transparent transition-[background-position] duration-500 ease-in-out hover:bg-[position:0_0]',
        className,
      )}
    >
      {children}
    </Comp>
  );
};
