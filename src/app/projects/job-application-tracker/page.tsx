import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectPageInProgress } from '@/components/projects/ProjectPageInProgress';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function JobApplicationTracker() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          {
            name: 'Job Application Tracker',
            path: '/projects/job-application-tracker',
          },
        ])}
      />
      <PageHeader
        title='Job Application Tracker'
        description='Keeps my job search in one place: every application, its timeline of events, and the resume version it used (extra cool because it is stored in GitHub).'
      />
      <ProjectPageInProgress />
    </main>
  );
}
