import { WaveSprayLazy } from '@/components/animated-fun/WaveSprayLazy';
import { PageHeader } from '@/components/layout/PageHeader';
import { CompositionCard } from '@/components/music/CompositionCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { compositions } from '@/lib/music';
import { buildCompositionItemListJsonLd } from '@/lib/seo/jsonLd';

export default function MusicPage() {
  return (
    <main className='bg-background page-shell page-measure'>
      <JsonLd data={buildCompositionItemListJsonLd(compositions)} />
      <PageHeader
        title='Music'
        description='My original compositions and their stories from throughout my musical life.'
        decoration={
          <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
            <WaveSprayLazy
              colorStart='--tw-color-breeze-600'
              colorEnd='--tw-color-breeze-300'
            />
          </div>
        }
        fadeDecoration={true}
      />

      <ul
        role='list'
        className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
      >
        {compositions.map((composition, index) => (
          <li key={composition.slug}>
            <CompositionCard composition={composition} index={index} />
          </li>
        ))}
      </ul>
    </main>
  );
}
