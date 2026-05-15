import { PageHeader } from '@/components/layout/PageHeader';

export default function AboutMe() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='About Me'
        description="Hey! I'm Kyle, a Software Engineering student at McMaster
        University."
      />
    </main>
  );
}
