import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { CompositionBody } from '@/components/music/CompositionBody';
import { JsonLd } from '@/components/seo/JsonLd';
import { compositions, getComposition } from '@/lib/music';
import { compositionHref, writeupExcerpt } from '@/lib/musicFormat';
import { pageMetadata } from '@/lib/seo';
import {
  buildBreadcrumbJsonLd,
  buildMusicCompositionJsonLd,
} from '@/lib/seo/jsonLd';

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return compositions.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const composition = getComposition((await params).slug);
  if (!composition) return {};

  return pageMetadata({
    title: composition.title,
    description: writeupExcerpt(composition.writeup),
    path: compositionHref(composition),
  });
}

export default async function CompositionPage({ params }: { params: Params }) {
  const composition = getComposition((await params).slug);
  if (!composition) notFound();

  const path = compositionHref(composition);

  return (
    <main className='bg-background page-shell page-measure'>
      <JsonLd data={buildMusicCompositionJsonLd(composition)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Music', path: '/music' },
          { name: composition.title, path },
        ])}
      />
      <div className='mx-auto w-full max-w-3xl'>
        <PageHeader title={composition.title} description={composition.subtitle} />
      </div>
      <CompositionBody composition={composition} />
    </main>
  );
}
