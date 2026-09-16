import { WaveSpray } from '@/components/animated-fun/Wavespray';
import PhotoWall from '@/components/gallery/PhotoWall';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Gallery() {
  return (
    <main className='bg-background page-shell'>
      <PageHeader
        title='Gallery'
        description='A collection of photos I took over the years. What catches my eye or I want to remember.'
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSpray
              colorStart='--tw-color-lush-600'
              colorEnd='--tw-color-nebula-400'
            />
          </div>
        }
        fadeDecoration={true}
      />

      <PhotoWall />
    </main>
  );
}
