import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectPageInProgress } from '@/components/projects/ProjectPageInProgress';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function DinoMind() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'DinoMind', path: '/projects/dino-mind' },
        ])}
      />
      <PageHeader
        title='DinoMind'
        description='A journaling app with a dino companion that summarizes your day, reads your mood, and plans your tomorrow. Built with a team of four in 36 hours, and it won Best Health Hack at DeltaHacks X.'
      />
      <ProjectPageInProgress />
    </main>
  );
}
