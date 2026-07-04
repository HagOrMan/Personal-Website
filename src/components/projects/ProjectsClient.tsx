'use client';

import React from 'react';

import { AnimatedProjectGrid } from '@/components/projects/AnimatedProjectGrid';
import { ProjectVariantPicker } from '@/components/projects/ProjectVariantPicker';
import { DEFAULT_VARIANT_ID } from '@/constant/variants/projectCardVariants';
import { TProjectShowcase } from '@/types/projects/ProjectShowcase';

export default function ProjectsClient({
  projects,
}: {
  projects: TProjectShowcase[];
}) {
  const [variantId, setVariantId] = React.useState(DEFAULT_VARIANT_ID);

  return (
    <>
      <div className='mb-6 flex justify-end'>
        <ProjectVariantPicker value={variantId} onChange={setVariantId} />
      </div>

      <AnimatedProjectGrid
        variantId={variantId}
        projects={projects}
        mode='checkerboard'
      />
    </>
  );
}
