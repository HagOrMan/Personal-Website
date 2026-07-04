import { WaveSpray } from '@/components/animated-fun/Wavespray';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AboutMe() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='About Me'
        description="Hey! I'm Kyle, a Software Engineering student at McMaster
        University."
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSpray
              colorStart='--tw-color-breeze-300'
              colorEnd='--tw-color-lush-300'
            />
          </div>
        }
        fadeDecoration={true}
      />
    </main>
  );
}
