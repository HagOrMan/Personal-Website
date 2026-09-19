import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'Finance Tracker';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'Finance Tracker',
    subtitle:
      'A personal finance tracker for daily spending and group-purchase disbursements.',
  });
}
