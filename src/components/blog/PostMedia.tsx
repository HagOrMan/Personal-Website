import type { ComponentProps, ReactNode } from 'react';
import type { ExtraProps } from 'react-markdown';

/**
 * The `img` slot for a rendered post.
 *
 * Markdown has exactly one "show this file here" syntax, so posts reach for
 * the image form for anything worth putting inline - including a PDF:
 *
 *   ![](../../assets/20260515-summer-reflections/HatchFloorPlan_Original.pdf)
 *
 * Path rewriting points that at the asset proxy correctly and the proxy serves
 * the bytes as application/pdf, but react-markdown still renders the reference
 * as `<img src="....pdf">`, and an `<img>` can only ever decode an image. The
 * PDF (and equally an mp4 or an mp3 written the same way) collapses to a
 * broken image - with, in the common `![]()` case, not even alt text to show
 * for it. That is the whole bug: the file is fine, the element isn't.
 *
 * So this dispatches on the file extension and picks an element that can
 * actually display what was linked. Real images pass through untouched.
 *
 * Everything below is phrasing content (`<span>`, `<object>`, `<video>`,
 * `<audio>`, `<a>`) on purpose: a standalone markdown image is wrapped in a
 * `<p>`, and a `<div>`/`<figure>` in that position gets hoisted out of the
 * paragraph by the HTML parser, which desyncs hydration.
 */

// Extensions an <img> can actually decode. An empty extension counts as an
// image too (see mediaKind) - a bare /api/og-style route is still a picture.
const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
  'ico',
]);

// Deliberately limited to what the asset proxy serves with a real media type
// (MIME_TYPES in lib/blog/github.ts). Anything else reaches the browser as
// application/octet-stream, which no <video>/<audio> will play - those are
// better off as a link.
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm']);
const AUDIO_EXTENSIONS = new Set(['mp3']);

type MediaKind = 'image' | 'pdf' | 'video' | 'audio' | 'file';

/** The file name a URL ends in, with any query string and hash dropped. */
function fileName(src: string): string {
  const name = src.split(/[?#]/)[0].split('/').pop() ?? '';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function extensionOf(name: string): string {
  return /\.([^.]+)$/.exec(name)?.[1].toLowerCase() ?? '';
}

function mediaKind(extension: string): MediaKind {
  if (!extension || IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  return 'file';
}

/**
 * Whether the file is served by this site. Only those get embedded in an
 * `<object>`: a post from an untrusted source can point an image reference at
 * any absolute URL, and an `<object>` is a document embed where an `<img>` was
 * only ever a picture. Off-site references fall back to a plain link.
 */
function isSameOrigin(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('//');
}

/** The label under an embed, and the whole render for a plain file link. */
function MediaLink({
  href,
  title,
  children,
}: {
  href: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} title={title} target='_blank' rel='noopener noreferrer'>
      {children}
    </a>
  );
}

export type PostMediaProps = ComponentProps<'img'> & ExtraProps;

export function PostMedia({
  src,
  alt,
  title,
  // react-markdown's hast node. Dropped rather than spread, or React warns
  // about an unknown DOM attribute.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  node,
  ...props
}: PostMediaProps) {
  // React's img typings allow a Blob src (an experimental React DOM feature),
  // so `src` is `string | Blob | undefined` here. Markdown can only ever
  // produce a URL, and only a string can be inspected for an extension or
  // handed to a link - so narrow once and use `url` everywhere below.
  const url = typeof src === 'string' ? src : undefined;
  const kind = url ? mediaKind(extensionOf(fileName(url))) : 'image';

  if (!url || kind === 'image') {
    // Post images are arbitrary files proxied through /blog-assets, with no
    // dimensions known ahead of time, so next/image has nothing to work with.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ''} title={title} {...props} />;
  }

  // `![]()` carries no alt, which is exactly the case that rendered as nothing
  // before - fall back to the file's own name so there is always a label.
  const label = alt?.trim() || fileName(url);

  if (kind === 'pdf' && isSameOrigin(url)) {
    return (
      <span className='my-6 block'>
        <object
          data={url}
          type='application/pdf'
          aria-label={label}
          title={title}
          className='border-border bg-muted block h-[min(80vh,40rem)] w-full rounded-lg border'
        >
          {/* Shown wherever inline PDFs aren't supported - iOS Safari and
              most mobile browsers - alongside the link below. */}
          <span className='text-muted-foreground block p-6 text-center text-sm'>
            This browser can&apos;t display PDFs inline.
          </span>
        </object>
        <span className='mt-2 block text-center text-sm'>
          <MediaLink href={url} title={title}>
            Open {label}
          </MediaLink>
        </span>
      </span>
    );
  }

  if (kind === 'video') {
    return (
      <video
        src={url}
        controls
        preload='metadata'
        aria-label={label}
        title={title}
        className='my-6 block w-full rounded-lg'
      />
    );
  }

  if (kind === 'audio') {
    return (
      <audio
        src={url}
        controls
        preload='metadata'
        aria-label={label}
        title={title}
        className='my-4 block w-full'
      />
    );
  }

  // A PDF from another origin, or a file type nothing here can display: a
  // link is honest about it and still gets the reader to the file.
  return (
    <MediaLink href={url} title={title}>
      {label}
    </MediaLink>
  );
}
