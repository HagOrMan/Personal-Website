import { WaveSprayLazy } from '@/components/animated-fun/WaveSprayLazy';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Resume() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Resume'
        description='Want to view my resume? Request access here!'
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSprayLazy
              colorStart='--tw-color-breeze-800'
              colorEnd='--tw-color-nebula-400'
            />
          </div>
        }
        fadeDecoration={true}
      />
    </main>
  );
}
