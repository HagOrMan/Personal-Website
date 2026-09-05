import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectPageInProgress } from '@/components/projects/ProjectPageInProgress';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function FinanceTracker() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: 'Finance Tracker', path: '/projects/finance-tracker' },
        ])}
      />
      <PageHeader
        title='Finance Tracker'
        description='Tracks my daily spending and the money owed back from group purchases, rebuilt from a Streamlit prototype into a Next.js stack.'
      />
      <ProjectPageInProgress />
    </main>
  );
}
