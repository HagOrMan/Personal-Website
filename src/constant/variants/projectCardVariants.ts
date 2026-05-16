/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This files exists so I may play with different showcase variants to decide which ones I prefer
 * I want to keep a history of my tests and thought it would be a fun way of showing the progress
 */

// import other variants as you build them
// import { ProjectShowcaseCardMinimal } from '@/components/containers/ProjectShowcaseCardMinimal';
// import { ProjectShowcaseCardCompact } from '@/components/containers/ProjectShowcaseCardCompact';
import type { ComponentType } from 'react';

import { ProjectShowcaseCard } from '@/components/containers/ProjectShowcaseCard';
import { TProjectShowcase } from '@/types/projects/ProjectShowcase';

// The only props the parent (the page) supplies.
// Everything else must come from `extraProps` on the variant entry.
export type ProjectCardCommonProps = {
  project: TProjectShowcase;
  index: number;
};

// A variant entry pairs a component with the extra props it needs.
// The generic `P` is inferred from the Component, so extraProps must match.
export type ProjectCardVariant<
  P extends ProjectCardCommonProps = ProjectCardCommonProps,
> = {
  id: string;
  name: string;
  description?: string;
  Component: ComponentType<P>;
  // Whatever P requires beyond the common props.
  extraProps: Omit<P, keyof ProjectCardCommonProps>;
};

// Helper that infers `P` from the Component, so TS enforces extraProps shape.
function defineVariant<P extends ProjectCardCommonProps>(
  v: ProjectCardVariant<P>,
): ProjectCardVariant<any> {
  return v as ProjectCardVariant<any>;
}

export const PROJECT_CARD_VARIANTS: ProjectCardVariant<any>[] = [
  defineVariant({
    id: 'alternating',
    name: 'Alternating',
    description: 'Alternating border and glow',
    Component: ProjectShowcaseCard,
    extraProps: { variant: 'alternating' },
  }),
  defineVariant({
    id: 'unified',
    name: 'Unified',
    description: 'Unified border colour, alternating glow effects',
    Component: ProjectShowcaseCard,
    extraProps: { variant: 'unified' },
  }),
  // Future variant with a different component & prop shape:
  // defineVariant({
  //   id: 'minimal',
  //   name: 'Minimal',
  //   description: 'Text-forward, no imagery',
  //   Component: ProjectShowcaseCardMinimal,
  //   extraProps: {}, // or whatever it needs
  // }),
];

export const DEFAULT_VARIANT_ID = PROJECT_CARD_VARIANTS[0].id;
