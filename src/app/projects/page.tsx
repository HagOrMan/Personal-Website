import { ProjectShowcaseCard } from '@/components/containers/ProjectShowcaseCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { projects } from '@/constant/projects';

export default function Projects() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Projects'
        description="Here are all the projects I've worked on and am proud to share!"
      />

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {projects.map((project, index) => {
          return (
            <ProjectShowcaseCard key={index} project={project} index={index} />
          );
        })}
      </div>
    </main>
  );
}
