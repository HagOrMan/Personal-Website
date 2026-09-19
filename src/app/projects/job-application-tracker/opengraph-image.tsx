import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'Job Application Tracker';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'Job Application Tracker',
    subtitle:
      'Applications, event timelines, resume versions, and reusable answers in one place.',
  });
}
