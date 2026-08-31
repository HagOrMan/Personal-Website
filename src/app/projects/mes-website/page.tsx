import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function MesWebsite() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'MES Website', path: '/projects/mes-website' },
        ])}
      />
      <PageHeader
        title='MES Website'
        description='I helped remake the McMaster Engineering Society website from Wix into Next.js, designing and building pages for the whole engineering student body.'
      />
    </main>
  );
}
