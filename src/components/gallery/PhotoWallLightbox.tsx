'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Lightbox } from '@/components/ui/Lightbox';

import {
  fallbackExtFor,
  type LightboxPhoto,
  srcSetFor,
  urlFor,
} from './photoSources';

/**
 * The enlarged copy is the largest thing on the screen by construction, so
 * there's no smaller candidate worth describing. Deliberately not the tile's
 * `sizes`, which is tuned in px for a ~250-360px slot and would have the
 * browser pick a file a fraction of the size it needs here.
 */
const LIGHTBOX_SIZES = '100vw';

/** How far a touch has to travel across the photo before it counts as a page. */
const SWIPE_MIN_PX = 48;

/**
 * Matches the close button rather than `actionVariants`, because a circle
 * around a single glyph is a shape rather than a corner radius - the one
 * exception the radius ladder makes, and the two controls sit in the same
 * viewer.
 */
const CHEVRON_CLASS =
  'focus-visible:ring-ring bg-background/80 text-foreground/80 hover:bg-accent hover:text-foreground inline-flex size-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition focus-visible:ring-2 focus-visible:outline-hidden active:scale-95 motion-reduce:transition-none';

/**
 * The tile hands over the button it was clicked on as well as its position,
 * because that button is where focus has to land again on close and Radix
 * only knows how to find a `Dialog.Trigger` - which a wall of seventy
 * interchangeable tiles can't be.
 */
const OpenPhotoContext = createContext<
  ((index: number, trigger: HTMLElement) => void) | null
>(null);

/**
 * A tile's click target, and the whole of the wall that has to be a client
 * component.
 *
 * It goes *inside* the figure rather than around it: the justified rows put
 * `flex-grow` and `flex-basis` on the figure, and a wrapper element between
 * the row and the figure breaks the row maths - subtly, in that most rows
 * still look right. See the comment in PhotoWall.module.css.
 */
export function PhotoTileTrigger({
  index,
  total,
  className,
  children,
}: {
  index: number;
  total: number;
  className?: string;
  children: ReactNode;
}) {
  const openPhoto = useContext(OpenPhotoContext);

  return (
    <button
      type='button'
      className={className}
      // Every alt in the manifest is an empty string, so there's no per-photo
      // text to name this with. The position is the only honest handle, and
      // it's what the dialog gives itself once it's open.
      aria-label={`Open photo ${index + 1} of ${total}`}
      onClick={(event) => openPhoto?.(index, event.currentTarget)}
    >
      {children}
    </button>
  );
}

/**
 * The enlarged photo. Built by hand for the same reason the tiles are: the
 * files are already optimised at build time and served from R2 with immutable
 * caching, so `next/image` would only add billed transforms.
 */
function EnlargedPhoto({
  photo,
  onLoad,
  onSwipe,
}: {
  photo: LightboxPhoto;
  onLoad: (image: HTMLImageElement) => void;
  onSwipe: (delta: number) => void;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const fallbackExt = fallbackExtFor(photo);

  return (
    <picture
      className='w-full'
      // The swipe listens here rather than across the whole layer because a
      // touch that starts anywhere else has already dismissed the viewer on
      // pointerdown - and swiping the photo itself is the gesture anyway.
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch
          ? { x: touch.clientX, y: touch.clientY }
          : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;

        const touch = event.changedTouches[0];
        if (!start || !touch) return;

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;

        // Far enough, and more across than down - so a scroll or a pinch that
        // drifts sideways on the way past doesn't page the gallery.
        if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
        onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      {photo.formats.includes('avif') && (
        <source
          type='image/avif'
          srcSet={srcSetFor(photo, 'avif')}
          sizes={LIGHTBOX_SIZES}
        />
      )}
      {photo.formats.includes('webp') && (
        <source
          type='image/webp'
          srcSet={srcSetFor(photo, 'webp')}
          sizes={LIGHTBOX_SIZES}
        />
      )}
      <img
        src={urlFor(photo, photo.widths[photo.widths.length - 1], fallbackExt)}
        srcSet={srcSetFor(photo, fallbackExt)}
        sizes={LIGHTBOX_SIZES}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        decoding='async'
        onLoad={(event) => onLoad(event.currentTarget)}
        // `block` for the same reason the wall's tiles have it: <picture> is
        // an ordinary block, so an inline image inside it sits on a baseline
        // and leaves a strip of descender space underneath.
        className='block h-auto w-full rounded-lg shadow-2xl'
      />
    </picture>
  );
}

/** Which photo has finished loading, and which format this browser took. */
type LoadedPhoto = { index: number; ext: string };

/**
 * The interactive shell around the wall: it holds which photo is open, pages
 * between them, and warms the neighbours so an arrow press doesn't wait on a
 * download.
 *
 * It wraps the wall rather than replacing it, so PhotoWall stays a server
 * component and the manifest and the tile markup stay server-rendered. Only
 * the triggers and this viewer are client-side.
 *
 * Deliberately absent: click-to-page zones over the left and right of the
 * photo. They'd fight the dismiss gesture `Lightbox` carries, where a
 * pointerdown anywhere that isn't the picture closes the viewer. Leaving them
 * out is what lets that logic come across untouched.
 */
export function PhotoWallLightbox({
  photos,
  children,
}: {
  photos: LightboxPhoto[];
  children: ReactNode;
}) {
  const total = photos.length;

  const [index, setIndex] = useState<number | null>(null);
  const isOpen = index !== null;
  const photo = index === null ? null : photos[index];

  // The tile the viewer was opened from, which is where focus goes back to -
  // the one opened, not the one paged to, so closing puts the keyboard back
  // where it left the wall.
  const openedFrom = useRef<HTMLElement | null>(null);

  const openPhoto = useCallback((at: number, trigger: HTMLElement) => {
    openedFrom.current = trigger;
    setIndex(at);
  }, []);

  // Paging wraps, which is why neither chevron is ever disabled: a control
  // that disables itself under the pointer takes the focus with it, and at
  // seventy photos either end is a long way from anywhere.
  const page = useCallback(
    (delta: number) =>
      setIndex((current) =>
        current === null ? current : (current + delta + total) % total,
      ),
    [total],
  );

  useEffect(() => {
    if (!isOpen) return;

    // A document listener is safe here because the background is inert while
    // the dialog is open, so nothing else on the page can be listening for
    // these. Escape is Radix's already.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') page(-1);
      else if (event.key === 'ArrowRight') page(1);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, page]);

  const [loaded, setLoaded] = useState<LoadedPhoto | null>(null);

  // Held so an in-flight preload can't be collected before it lands in the
  // HTTP cache.
  const preloading = useRef<HTMLImageElement[]>([]);

  const handleLoad = useCallback(
    (image: HTMLImageElement) => {
      if (index === null) return;
      const at = index;

      // currentSrc is the candidate the <picture> actually resolved to, which
      // beats probing for avif support: the element that will render the
      // neighbours has already answered the question.
      const ext = image.currentSrc.split('?')[0].split('.').pop();
      if (!ext) return;

      setLoaded((current) =>
        current?.index === at && current.ext === ext
          ? current
          : { index: at, ext },
      );
    },
    [index],
  );

  useEffect(() => {
    if (!loaded || total < 2) return;

    // Keyed off the open photo having loaded rather than off the open photo
    // changing, so the two preloads aren't competing for bandwidth with the
    // picture someone is waiting to look at.
    const neighbours = [
      (loaded.index - 1 + total) % total,
      (loaded.index + 1) % total,
    ];

    preloading.current = neighbours.map((at) => {
      const neighbour = photos[at];
      const ext = neighbour.formats.includes(loaded.ext)
        ? loaded.ext
        : fallbackExtFor(neighbour);

      // srcset and sizes exactly as the lightbox will ask for them, so the
      // browser runs the same selection and caches the same candidate rather
      // than the width either side of it.
      const image = new window.Image();
      image.sizes = LIGHTBOX_SIZES;
      image.srcset = srcSetFor(neighbour, ext);
      return image;
    });
  }, [loaded, photos, total]);

  return (
    <OpenPhotoContext.Provider value={openPhoto}>
      {children}

      <Lightbox
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) setIndex(null);
        }}
        title={index === null ? '' : `Photo ${index + 1} of ${total}`}
        ratio={photo?.aspectRatio ?? 1}
        restoreFocusTo={openedFrom}
        caption={
          index === null ? undefined : (
            // Where the photo came in the set, and the controls that change
            // it - the only things under the picture, because the position is
            // the only thing the manifest knows about it.
            //
            // The chevrons sit here rather than pinned to the left and right
            // edges because there is often no edge to pin them to: the
            // picture is sized `min(100%, height * ratio)`, so on every
            // viewport where the width binds - phones, tablet portrait, any
            // window under roughly 1280px - it fills the content box and
            // leaves no backdrop beside it. Under the photo is the one
            // placement that holds at every size and every aspect ratio.
            <span className='flex items-center justify-center gap-4'>
              {total > 1 && (
                <button
                  type='button'
                  aria-label='Previous photo'
                  className={CHEVRON_CLASS}
                  onClick={() => page(-1)}
                >
                  <ChevronLeft className='size-5' />
                </button>
              )}

              {/* Paging moves no focus and the picture carries no text, so
                  without a live region a screen reader pages blind. */}
              <span aria-live='polite' className='tabular-nums'>
                {index + 1} / {total}
              </span>

              {total > 1 && (
                <button
                  type='button'
                  aria-label='Next photo'
                  className={CHEVRON_CLASS}
                  onClick={() => page(1)}
                >
                  <ChevronRight className='size-5' />
                </button>
              )}
            </span>
          )
        }
      >
        {photo && (
          <EnlargedPhoto photo={photo} onLoad={handleLoad} onSwipe={page} />
        )}
      </Lightbox>
    </OpenPhotoContext.Provider>
  );
}
