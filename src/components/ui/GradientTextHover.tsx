import React from 'react';

import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface GradientTextHoverProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

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
