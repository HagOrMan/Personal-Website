import AboutMeClient from '@/components/about-me/AboutMeClient';
import { WaveSpray } from '@/components/animated-fun/Wavespray';
import { PageHeader } from '@/components/layout/PageHeader';
import { PORTFOLIO_VIDEOS } from '@/constant/videos';

export default function AboutMe() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='About Me'
        description='Get to know me through the page below - or hear it straight from me on video.'
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

      <AboutMeClient videos={PORTFOLIO_VIDEOS} />
    </main>
  );
}
