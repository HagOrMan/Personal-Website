import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function PiratenKapern() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'Piraten Kapern', path: '/projects/piraten-kapern' },
        ])}
      />
      <PageHeader
        title='Piraten Kapern'
        description='A real game that was remade using Java.'
      />
    </main>
  );
}
