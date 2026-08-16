import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function InfinityChess() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'Infinity Chess', path: '/projects/infinity-chess' },
        ])}
      />
      <PageHeader
        title='Infinity Chess'
        description='A Chess variant with pieces able to go in one wall and come out the other.'
      />
    </main>
  );
}
