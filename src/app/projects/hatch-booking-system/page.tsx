import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonLd';

export default function HatchBookingSystem() {
  return (
    <main className='bg-background page-shell'>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          {
            name: 'Hatch Booking System',
            path: '/projects/hatch-booking-system',
          },
        ])}
      />
      <PageHeader
        title='Hatch Booking System'
        description='I led a team of engineering students in the McMaster Engineering Society to make a custom booking system for study rooms!'
      />
    </main>
  );
}
