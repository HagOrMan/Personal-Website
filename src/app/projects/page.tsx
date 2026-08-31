import { Suspense } from 'react';

import { WaveSpray } from '@/components/animated-fun/Wavespray';
import { PageHeader } from '@/components/layout/PageHeader';
import ProjectsClient from '@/components/projects/ProjectsClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { projects } from '@/constant/projects';
import { assertProjectRoutesExist } from '@/lib/projects/verifySlugs';
import { buildProjectItemListJsonLd } from '@/lib/seo/jsonLd';

export default function Projects() {
  // This page is statically generated, so a slug without a detail page fails
  // the build here rather than shipping a card that 404s.
  assertProjectRoutesExist(projects);

  return (
    <main className='bg-background page-shell'>
      <JsonLd data={buildProjectItemListJsonLd(projects)} />
      <PageHeader
        title='Projects'
        description="Here are all the projects I've worked on and am proud to share!"
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSpray />
          </div>
        }
        fadeDecoration={true}
      />

      {/* ProjectsClient reads the filter state out of the query string, and
          useSearchParams() needs a Suspense boundary to stay static. */}
      <Suspense>
        <ProjectsClient projects={projects} />
      </Suspense>
    </main>
  );
}
