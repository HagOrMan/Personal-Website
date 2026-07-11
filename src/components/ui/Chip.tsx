import * as React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// The one pill style for tags/filters across the site. Renders a static
// <span> by default; pass asChild with a <button> (filter chips in
// BlogIndexClient) or a <Link> (tag links in BlogPostHeader) - the
// [button&]/[a&] selectors below only kick in then, same trick as Badge's
// [a&] hover styles.
const chipVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap transition-colors [button&]:cursor-pointer focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-foreground [button&]:hover:bg-accent/70 [a&]:hover:bg-accent/70',
        active:
          'bg-primary text-primary-foreground [button&]:hover:bg-primary/90 [a&]:hover:bg-primary/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Chip({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof chipVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot='chip'
      className={cn(chipVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Chip, chipVariants };
