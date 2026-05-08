import { ProjectShowcaseCard } from '@/components/containers/ProjectShowcaseCard';
import { projects } from '@/constant/projects';

export default function Projects() {
  return (
    <main className='bg-background'>
      <h1 className='text-4xl'>Projects</h1>
      <p>
        Here are all the projects I&apos;ve worked on and am proud to share!
      </p>

      <div className='my-8 grid grid-cols-1 gap-4 px-8 md:grid-cols-2 lg:grid-cols-3'>
        {projects.map((project, index) => {
          return (
            <ProjectShowcaseCard key={index} project={project} index={index} />
          );
        })}
      </div>
    </main>
  );
}
