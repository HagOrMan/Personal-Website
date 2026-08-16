import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function MonPoke() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'MonPoke', path: '/projects/monpoke' },
        ])}
      />
      <PageHeader
        title='MonPoke'
        description='A fun game of catching MonPokes using pygame.'
      />
    </main>
  );
}
