import { notFound } from 'next/navigation';

import { CompositionBody } from '@/components/music/CompositionBody';
import { CompositionModal } from '@/components/music/CompositionModal';
import { compositions, getComposition } from '@/lib/music';

// Intercepts client-side navigation to /music/[slug] from anywhere on the
// site and shows it as a modal over the current page. A hard load of the same
// URL skips this and renders app/music/[slug]/page.tsx.
export function generateStaticParams() {
  return compositions.map(({ slug }) => ({ slug }));
}

export default async function CompositionModalRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const composition = getComposition((await params).slug);
  if (!composition) notFound();

  return (
    <CompositionModal
      title={composition.title}
      subtitle={composition.subtitle}
    >
      <CompositionBody composition={composition} />
    </CompositionModal>
  );
}
