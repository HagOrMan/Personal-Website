import { PageHeader } from '@/components/layout/PageHeader';
import ProjectsClient from '@/components/projects/ProjectsClient';
import { projects } from '@/constant/projects';

export default function Projects() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Projects'
        description="Here are all the projects I've worked on and am proud to share!"
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl bg-gray-600 md:size-28'>
            {/* <OceanSunriseScene /> */}
          </div>
        }
      />

      <ProjectsClient projects={projects} />
    </main>
  );
}
