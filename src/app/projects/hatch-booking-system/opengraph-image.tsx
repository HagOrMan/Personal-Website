import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og/renderOgImage';

export const alt = 'Hatch Booking System';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Project',
    title: 'Hatch Booking System',
    subtitle:
      'A booking system built in the McMaster Engineering Society to book Engineering study rooms.',
  });
}
