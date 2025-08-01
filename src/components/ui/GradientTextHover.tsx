import React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva, VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export const gradientTextHover = cva(
  'bg-clip-text text-transparent transition-[background-position] duration-500 ease-in-out',
  {
    variants: {
      colour: {
        lush: 'bg-[linear-gradient(to_right,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]',
        breeze:
          'bg-[linear-gradient(to_right,_theme(colors.breeze.600)_50%,_theme(colors.foreground)_50%)]',
        nebula:
          'bg-[linear-gradient(to_right,_theme(colors.nebula.600)_50%,_theme(colors.foreground)_50%)]',
      },
      direction: {
        right:
          'bg-[length:200%_100%] bg-[position:100%_0] hover:bg-[position:0_0]',
        left: 'bg-[length:200%_100%] bg-[position:0_0] hover:bg-[position:100%_0]',
        top: 'bg-[length:100%_200%] bg-[position:0_0] hover:bg-[position:0_100%]',
        bottom:
          'bg-[length:100%_200%] bg-[position:0_100%] hover:bg-[position:0_0]',
      },
    },
    compoundVariants: [
      // RIGHT
      {
        colour: 'lush',
        direction: 'right',
        class:
          'bg-[linear-gradient(to_right,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'breeze',
        direction: 'right',
        class:
          'bg-[linear-gradient(to_right,_theme(colors.breeze.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'nebula',
        direction: 'right',
        class:
          'bg-[linear-gradient(to_right,_theme(colors.nebula.600)_50%,_theme(colors.foreground)_50%)]',
      },

      // LEFT
      {
        colour: 'lush',
        direction: 'left',
        class:
          'bg-[linear-gradient(to_left,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'breeze',
        direction: 'left',
        class:
          'bg-[linear-gradient(to_left,_theme(colors.breeze.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'nebula',
        direction: 'left',
        class:
          'bg-[linear-gradient(to_left,_theme(colors.nebula.600)_50%,_theme(colors.foreground)_50%)]',
      },

      // TOP
      {
        colour: 'lush',
        direction: 'top',
        class:
          'bg-[linear-gradient(to_top,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'breeze',
        direction: 'top',
        class:
          'bg-[linear-gradient(to_top,_theme(colors.breeze.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'nebula',
        direction: 'top',
        class:
          'bg-[linear-gradient(to_top,_theme(colors.nebula.600)_50%,_theme(colors.foreground)_50%)]',
      },

      // BOTTOM
      {
        colour: 'lush',
        direction: 'bottom',
        class:
          'bg-[linear-gradient(to_bottom,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'breeze',
        direction: 'bottom',
        class:
          'bg-[linear-gradient(to_bottom,_theme(colors.breeze.600)_50%,_theme(colors.foreground)_50%)]',
      },
      {
        colour: 'nebula',
        direction: 'bottom',
        class:
          'bg-[linear-gradient(to_bottom,_theme(colors.nebula.600)_50%,_theme(colors.foreground)_50%)]',
      },
    ],
    defaultVariants: {
      colour: 'lush',
      direction: 'right',
    },
  },
);

export type GradientTextHoverVariants = VariantProps<typeof gradientTextHover>;

interface GradientTextHoverProps extends GradientTextHoverVariants {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Creates a component that has the text on the input children be the foreground originally and animate on hover with a new colour coming in from left to right, fully replacing the foreground.
 * > There exist two variants, colour and direction
 * - **Colour** determines the colour on hover at level 600 of the custom css variables in globals.css. It can be overridden with a long className passed in (see below)
 * - **Direction** determines the direction the gradient travels on hover. The defualt, "right", meaning the gradient goes to the right
 *
 * The default colour is currently lush-600, but that can be modified by passing in a className.
 * - The passed in className must be a variation of `bg-[linear-gradient(to_right,_theme(colors.lush.600)_50%,_theme(colors.foreground)_50%)]`
 *   - If using a different direction, use the appropriate modifier instead of `to_right`. eg. for to top, replace with `to_top`
 * - `theme(colors.lush.600)` is the colour on hover
 * - `theme(colors.foreground)` is the base colour
 * - Modify either of these in the main style to change the regular/hover colours
 * The `asChild` parameter can be used to have the styles applied to children components of this component rather than text.
 *
 * Tip: when using `direction="bottom"` or `direction="top"` for text, add the className `duration-1000` or anything over 500. 500 is too fast as the height of text is often smaller than its length
 *
 * **Examples:**
 * - **Using regular text:** `<GradientTextHover>Text To Animate On Hover</GradientTextHover>`
 * - **Using a custom component:** `<GradientTextHover asChild><CustomComponent/></GradientTextHover>`
 * - **Using a custom component with text inside:** `<GradientTextHover asChild><CustomComponent>Text to Animate</CustomComponent></GradientTextHover>`
 */
export const GradientTextHover = ({
  asChild,
  children,
  className,
  colour,
  direction,
}: GradientTextHoverProps) => {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      aria-hidden='true'
      className={cn(gradientTextHover({ colour, direction }), className)}
    >
      {children}
    </Comp>
  );
};
