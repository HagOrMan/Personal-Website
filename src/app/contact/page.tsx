import { WaveSpray } from '@/components/animated-fun/Wavespray';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Contact() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Contact'
        description='Want to contact me? Enter your email below.'
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSpray
              colorStart='--tw-color-lush-800'
              colorEnd='--tw-color-lush-400'
            />
          </div>
        }
        fadeDecoration={true}
      />
    </main>
  );
}
