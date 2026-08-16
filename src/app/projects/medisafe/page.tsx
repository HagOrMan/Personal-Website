import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function MediSafe() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'MediSafe', path: '/projects/medisafe' },
        ])}
      />
      <PageHeader
        title='MediSafe'
        description='A winning hackathon project to eliminate negative medical drug interactions.'
      />
    </main>
  );
}
