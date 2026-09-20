import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectPageInProgress } from '@/components/projects/ProjectPageInProgress';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function IslandBuilder() {
  return (
    <main className='bg-background page-shell page-measure'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'Island Builder', path: '/projects/island-builder' },
        ])}
      />
      <PageHeader
        title='Island Builder'
        description='Imagine making islands with the click of a button, filled with cities, roads, and even different environments based on surrounding climates.'
      />
      <ProjectPageInProgress />
    </main>
  );
}
