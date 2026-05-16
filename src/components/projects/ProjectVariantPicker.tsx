'use client';

import * as React from 'react';

import { Check, ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  PROJECT_CARD_VARIANTS,
  type ProjectCardVariant,
} from '@/constant/variants/projectCardVariants';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function ProjectVariantPicker({ value, onChange, className }: Props) {
  const active =
    PROJECT_CARD_VARIANTS.find((v) => v.id === value) ??
    PROJECT_CARD_VARIANTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'group inline-flex items-center gap-2 rounded-full',
          'border-border/60 bg-background/60 border backdrop-blur-md',
          'px-4 py-2 text-sm font-medium',
          'shadow-sm transition-all duration-200',
          'hover:border-border hover:bg-accent/40 hover:shadow-md',
          'focus:outline-none',
          'data-[state=open]:border-foreground/30 data-[state=open]:shadow-md',
          className,
        )}
      >
        <span className='text-muted-foreground text-xs tracking-wider uppercase'>
          Variant
        </span>
        <span className='text-foreground'>{active.name}</span>
        <ChevronDown
          className='text-muted-foreground size-4 transition-transform duration-200 group-data-[state=open]:rotate-180'
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='end'
        sideOffset={8}
        className='border-border/60 bg-popover/95 min-w-[16rem] rounded-xl p-1.5 backdrop-blur-xl'
      >
        {PROJECT_CARD_VARIANTS.map((variant) => (
          <VariantItem
            key={variant.id}
            variant={variant}
            isActive={variant.id === value}
            onSelect={() => onChange(variant.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VariantItem({
  variant,
  isActive,
  onSelect,
}: {
  variant: ProjectCardVariant;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={cn(
        'group/item flex cursor-pointer flex-col items-start gap-0.5 rounded-lg px-3 py-2.5',
        'transition-colors',
        isActive && 'bg-accent/60',
      )}
    >
      <div className='flex w-full items-center justify-between'>
        <span
          className={cn(
            'text-sm font-medium',
            isActive ? 'text-foreground' : 'text-foreground/90',
          )}
        >
          {variant.name}
        </span>
        <Check
          className={cn(
            'text-foreground size-4 transition-opacity',
            isActive ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
      {variant.description && (
        <span className='text-muted-foreground text-xs leading-snug'>
          {variant.description}
        </span>
      )}
    </DropdownMenuItem>
  );
}
