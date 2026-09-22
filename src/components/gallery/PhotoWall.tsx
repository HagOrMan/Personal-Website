import photos from '@/data/photos.json';

import {
  fallbackExtFor,
  type Photo,
  srcSetFor,
  toLightboxPhoto,
  urlFor,
} from './photoSources';
import { PhotoTileTrigger, PhotoWallLightbox } from './PhotoWallLightbox';

import styles from './PhotoWall.module.css';

/*
 * At the 270px desktop row height tiles render roughly 200-360px wide before
 * rows stretch to fill, on a photo set running 0.75 to 1.33 in aspect ratio.
 * Because the row height is a fixed pixel value, a tile's width barely moves
 * with the viewport - so `sizes` has to be in px. A `vw` value would have the
 * browser pull a multi-megabyte file for a 250px slot.
 *
 * Width is roughly aspectRatio * rowHeight. The 375 (rather than 270) is
 * headroom, since rows grow past the target, and it is tuned for the widest
 * step of the ladder in PhotoWall.module.css - narrower viewports use a
 * shorter row and simply fetch a slightly larger file than they need. Below
 * 700px the wall drops to two columns, which are wider than this.
 *
 * It scales with --row-h: raise one and raise the other in proportion, or the
 * browser picks files too small for the slot and the wall goes soft.
 */
const slotWidth = (photo: Photo) => Math.round(photo.aspectRatio * 375);

const sizesFor = (photo: Photo) =>
  `(max-width: 699px) 50vw, ${slotWidth(photo)}px`;

function Tile({
  photo,
  index,
  total,
  priority,
}: {
  photo: Photo;
  index: number;
  total: number;
  priority: boolean;
}) {
  const fallbackExt = fallbackExtFor(photo);
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
      {/* Inside the figure, never around it: the row maths lives on the
          figure's own flex-grow and flex-basis, and a wrapper between the row
          and the figure breaks it. See PhotoWall.module.css. */}
      <PhotoTileTrigger index={index} total={total} className={styles.trigger}>
        <picture>
          {photo.formats.includes('avif') && (
            <source
              type='image/avif'
              srcSet={srcSetFor(photo, 'avif')}
              sizes={sizes}
            />
          )}
          {photo.formats.includes('webp') && (
            <source
              type='image/webp'
              srcSet={srcSetFor(photo, 'webp')}
              sizes={sizes}
            />
          )}
          <img
            src={urlFor(photo, fallbackWidth, fallbackExt)}
            srcSet={srcSetFor(photo, fallbackExt)}
            sizes={sizes}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding='async'
          />
        </picture>
      </PhotoTileTrigger>
    </figure>
  );
}

/**
 * Justified photo wall, rendered entirely on the server.
 *
 * Deliberately not next/image: the files are already optimised at build time
 * by scripts/process-photos.mjs and served from R2 with immutable caching, so
 * routing them through Vercel's optimiser would add billed transformations
 * for no benefit.
 *
 * Still deliberately a server component, too. PhotoWallLightbox wraps it and
 * owns the viewer, but the manifest and every pixel of the tile markup are
 * server-rendered - only each tile's click target crosses into the client.
 */
export default function PhotoWall() {
  const list = photos as Photo[];

  return (
    <PhotoWallLightbox photos={list.map(toLightboxPhoto)}>
      <div className={styles.wall}>
        {list.map((photo, i) => (
          // The first handful are above the fold on most screens. Eager-loading
          // them keeps Largest Contentful Paint off the lazy-loading queue.
          <Tile
            key={photo.id}
            photo={photo}
            index={i}
            total={list.length}
            priority={i < 6}
          />
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
    </PhotoWallLightbox>
  );
}
