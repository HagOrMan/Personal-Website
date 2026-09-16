import photos from '@/data/photos.json';

import styles from './PhotoWall.module.css';

/*
 * Photos share the Cloudflare R2 bucket with the portfolio videos and are
 * served through its custom domain - never the r2.dev URL, which is rate
 * limited and unsupported for production (see .env.example).
 * They live under the `gallery/` prefix, so the base is the bucket domain
 * plus that prefix. See scripts/README.md for how they get there.
 *
 * Falls back to an empty base like constant/videos.ts does: a missing env var
 * should 404 the images rather than crash the page.
 */
const CDN = `${process.env.NEXT_PUBLIC_R2_BASE_URL ?? ''}/gallery`;

type Photo = {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
  widths: number[];
  formats: string[];
  color: string;
  blurDataURL: string;
  takenAt: string | null;
  alt: string;
};

/*
 * At a 180px row height tiles render 101-563px wide, median ~245px. Because
 * the row height is a fixed pixel value, a tile's width barely moves with the
 * viewport - so `sizes` has to be in px. A `vw` value would have the browser
 * pull a multi-megabyte file for a 165px slot.
 *
 * Width is roughly aspectRatio * rowHeight. The 250 (rather than 180) is
 * headroom, since rows grow past the target, and it is tuned for the widest
 * step of the ladder in PhotoWall.module.css - narrower viewports use a
 * shorter row and simply fetch a slightly larger file than they need. Below
 * 700px the wall drops to two columns, which are wider than this.
 */
const slotWidth = (photo: Photo) => Math.round(photo.aspectRatio * 250);

const sizesFor = (photo: Photo) =>
  `(max-width: 699px) 50vw, ${slotWidth(photo)}px`;

const srcSet = (photo: Photo, ext: string) =>
  photo.widths.map((w) => `${CDN}/${photo.id}-${w}.${ext} ${w}w`).join(', ');

function Tile({ photo, priority }: { photo: Photo; priority: boolean }) {
  const fallbackExt = photo.formats.includes('jpg') ? 'jpg' : 'webp';
  const sizes = sizesFor(photo);

  // The smallest generated width that still covers the slot, so the <img>
  // can never be the reason a 2400px file goes over the wire. Falls back to
  // the largest available when even that is too small.
  const target = slotWidth(photo);
  const fallbackWidth =
    photo.widths.find((w) => w >= target) ??
    photo.widths[photo.widths.length - 1];

  return (
    <figure
      className={styles.tile}
      style={
        {
          '--ar': photo.aspectRatio,
          '--tile-color': photo.color,
          '--tile-blur': `url("${photo.blurDataURL}")`,
        } as React.CSSProperties
      }
    >
      <picture>
        {photo.formats.includes('avif') && (
          <source
            type='image/avif'
            srcSet={srcSet(photo, 'avif')}
            sizes={sizes}
          />
        )}
        {photo.formats.includes('webp') && (
          <source
            type='image/webp'
            srcSet={srcSet(photo, 'webp')}
            sizes={sizes}
          />
        )}
        <img
          src={`${CDN}/${photo.id}-${fallbackWidth}.${fallbackExt}`}
          srcSet={srcSet(photo, fallbackExt)}
          sizes={sizes}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding='async'
        />
      </picture>
    </figure>
  );
}

/**
 * Justified photo wall, rendered entirely on the server.
 *
 * Deliberately not a client component and deliberately not next/image: the
 * files are already optimised at build time by scripts/process-photos.mjs and
 * served from R2 with immutable caching, so routing them through Vercel's
 * optimiser would add billed transformations for no benefit. If a lightbox is
 * added later, wrap the tiles in a small client component and leave the
 * manifest and image markup server-rendered.
 */
export default function PhotoWall() {
  const list = photos as Photo[];

  return (
    <div className={styles.wall}>
      {list.map((photo, i) => (
        // The first handful are above the fold on most screens. Eager-loading
        // them keeps Largest Contentful Paint off the lazy-loading queue.
        <Tile key={photo.id} photo={photo} priority={i < 6} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`spacer-${i}`}
          className={styles.spacer}
          style={{ '--ar': 1.3333 } as React.CSSProperties}
          aria-hidden='true'
        />
      ))}
    </div>
  );
}
