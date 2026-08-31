import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'MES Website';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'MES Website',
    subtitle:
      'The McMaster Engineering Society website, remade from Wix into Next.js.',
  });
}
