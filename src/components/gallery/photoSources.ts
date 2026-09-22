/*
 * Where the gallery's files live and how their srcsets are built.
 *
 * Shared between the wall (a server component) and the lightbox (a client
 * one) so the two can't drift into asking for different files - which would
 * cost a second download of every photo opened.
 *
 * Photos share the Cloudflare R2 bucket with the portfolio videos and are
 * served through its custom domain - never the r2.dev URL, which is rate
 * limited and unsupported for production (see .env.example).
 * They live under the `gallery/` prefix, so the base is the bucket domain
 * plus that prefix. See scripts/README.md for how they get there.
 *
 * Falls back to an empty base like constant/videos.ts does: a missing env var
 * should 404 the images rather than crash the page.
 */
export const CDN = `${process.env.NEXT_PUBLIC_R2_BASE_URL ?? ''}/gallery`;

/** One entry of src/data/photos.json, as scripts/process-photos.mjs writes it. */
export type Photo = {
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

/**
 * The fields the lightbox needs, which is the manifest minus the two big
 * ones. `blurDataURL` is a few hundred bytes of base64 per photo and is
 * already in the wall's markup - sending all 70 of them over again just to
 * reach the client would double that for nothing the enlarged view shows.
 */
export type LightboxPhoto = Pick<
  Photo,
  'id' | 'alt' | 'width' | 'height' | 'aspectRatio' | 'widths' | 'formats'
>;

export const toLightboxPhoto = (photo: Photo): LightboxPhoto => ({
  id: photo.id,
  alt: photo.alt,
  width: photo.width,
  height: photo.height,
  aspectRatio: photo.aspectRatio,
  widths: photo.widths,
  formats: photo.formats,
});

export const srcSetFor = (photo: LightboxPhoto, ext: string) =>
  photo.widths.map((w) => `${CDN}/${photo.id}-${w}.${ext} ${w}w`).join(', ');

/**
 * What the `<img>` inside a `<picture>` falls back to when none of the typed
 * sources match. Not a format in its own right - just whichever of the
 * generated ones is safest to hand a browser that took neither avif nor webp.
 */
export const fallbackExtFor = (photo: LightboxPhoto) =>
  photo.formats.includes('jpg') ? 'jpg' : 'webp';

export const urlFor = (photo: LightboxPhoto, width: number, ext: string) =>
  `${CDN}/${photo.id}-${width}.${ext}`;
