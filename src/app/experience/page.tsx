import { WaveSpray } from '@/components/animated-fun/Wavespray';
import { Timeline } from '@/components/experience/Timeline';
import { PageHeader } from '@/components/layout/PageHeader';
import { sortedExperiences } from '@/data/experiences';

export default function Experience() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Experience'
        description="I've had jobs. And volunteer experience. Read all about them here!"
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSpray
              colorStart='--tw-color-nebula-600'
              colorEnd='--tw-color-breeze-500'
            />
          </div>
        }
        fadeDecoration={true}
      />

      {/* Server component down to here - only the timeline subtree is client. */}
      <Timeline experiences={sortedExperiences} />
    </main>
  );
}
