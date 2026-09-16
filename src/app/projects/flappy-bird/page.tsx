import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectPageInProgress } from '@/components/projects/ProjectPageInProgress';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function FlappyBird() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'Flappy Bird', path: '/projects/flappy-bird' },
        ])}
      />
      <PageHeader
        title='Flappy Bird'
        description='My take on Flappy Bird in Pygame, with physics written from scratch and a two-player duel mode the original never had.'
      />
      <ProjectPageInProgress />
    </main>
  );
}
