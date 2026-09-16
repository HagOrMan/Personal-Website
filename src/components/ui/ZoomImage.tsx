'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Expand, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { usePrefersReducedMotion } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';

export type ZoomImageProps = {
  src: string;
  alt: string;
  /**
   * Intrinsic pixel size. Required rather than optional: the lightbox sizes
   * the picture off the viewport's *height* (see `pictureWidth` below), which
   * needs the ratio, and the thumbnail needs it to reserve the right box
   * before the file arrives.
   */
  width: number;
  height: number;
  /**
   * Shown under the enlarged picture, and the reason the lightbox keeps room
   * at the bottom rather than handing the image the whole screen.
   */
  caption?: string;
  /** Classes for the trigger - the box the thumbnail sits in. */
  className?: string;
  /** Classes for the thumbnail image itself. */
  imageClassName?: string;
  /** The thumbnail's `sizes`. The lightbox always asks for a full-viewport one. */
  sizes?: string;
  priority?: boolean;
};

/**
 * How much vertical space the lightbox spends on things that aren't the
 * picture. Lengths rather than classes because the picture's size is
 * arithmetic, not a percentage - keep these in step with the layer's `p-4`
 * and the figure's `gap-3`.
 */
const LAYER_PADDING_Y = '2rem';
const CAPTION_GAP = '0.75rem';

/** One line of `text-sm`: what the caption is worth until it's been measured. */
const CAPTION_FIRST_PAINT_HEIGHT = 20;

/**
 * Higher than Next's default 75, and only for the enlarged copy.
 *
 * The sources are already lossy webp, and the optimizer re-encodes whatever
 * it's given - so at the default the picture is compressed twice, and the
 * second pass is quantising artifacts from the first. That's invisible in a
 * 472px-wide thumbnail and very visible blown up across a laptop screen,
 * particularly on screenshots, where the damage lands on the edges of text.
 *
 * This buys back the second pass. It cannot buy back the first, and it can't
 * add pixels a 1080px-wide source never had - for that, the file itself has
 * to be re-exported larger. Keep this value in `images.qualities` in
 * next.config.ts, which is the allowlist the optimizer checks.
 */
const LIGHTBOX_QUALITY = 92;

/**
 * A thumbnail that opens full screen when you click it.
 *
 * The enlarged picture claims every pixel the viewport has in one dimension
 * or the other - as tall as the screen allows, or as wide, whichever runs out
 * first - with the caption in the strip kept back for it underneath. Close it
 * with the button, with Escape, or by clicking anywhere off the picture.
 *
 * Radix Dialog carries the modal machinery (focus trap, focus return,
 * Escape-to-close, scroll lock, aria-modal, inert background) exactly as it
 * does for ReferenceModal and VideoModalShell. Unlike those two this one owns
 * its Trigger rather than being controlled from outside, because a thumbnail
 * is the only thing that ever opens it.
 */
export function ZoomImage({
  src,
  alt,
  width,
  height,
  caption,
  className,
  imageClassName,
  sizes,
  priority = false,
}: ZoomImageProps) {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // The caption is laid out in normal flow beneath the picture, so the picture
  // may only claim the height the caption doesn't want. Measured rather than
  // assumed: a caption that wraps to three lines on a phone would otherwise
  // push the bottom of the image off the screen, and a fixed reserve big
  // enough for that case would waste a strip of every screen that carries a
  // one-liner.
  //
  // Nothing circular in that, because the caption's width comes from the
  // dialog and not from the picture - what the caption does can change the
  // picture's size, but not the other way round.
  const captionRef = useRef<HTMLElement>(null);
  const [captionHeight, setCaptionHeight] = useState(
    CAPTION_FIRST_PAINT_HEIGHT,
  );

  // The two things a click can land on that aren't "dismiss this" - see the
  // pointerdown handler on the dialog.
  const pictureRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // The caption only exists while the lightbox does, so `open` is what runs
    // the first measure on each open rather than something read in here.
    const element = open ? captionRef.current : null;
    if (!element) return;

    const measure = () => setCaptionHeight(element.offsetHeight);
    measure();

    // Rotation, resize, a late font swap - anything that can rewrap the text.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open, caption]);

  const ratio = width / height;
  const reservedHeight = caption
    ? `calc(${LAYER_PADDING_Y} + ${CAPTION_GAP} + ${captionHeight}px)`
    : LAYER_PADDING_Y;

  // Sized off the viewport HEIGHT rather than left to shrink-to-fit a width:
  // solve width = availableHeight * ratio, so the picture is always as tall as
  // the screen allows, and min() hands it back to the width on the viewports
  // where that binds first. The height stays `auto`, so this single
  // declaration covers both cases and the box hugs the picture exactly -
  // which is what puts the corners, the shadow, and the click-off test below
  // on the image itself rather than on empty letterboxing beside it.
  const pictureWidth = `min(100%, calc((100dvh - ${reservedHeight}) * ${ratio.toFixed(4)}))`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        {/* `flex` rather than `block` so the image is blockified and doesn't
            leave a strip of inline descender space beneath itself. */}
        <button
          type='button'
          aria-label={`Expand image: ${alt}`}
          className={cn(
            'group focus-visible:ring-ring relative flex w-full cursor-zoom-in rounded-lg focus-visible:ring-2 focus-visible:outline-hidden',
            className,
          )}
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            priority={priority}
            className={cn('h-auto w-full', imageClassName)}
          />

          {/* The affordance for anyone who doesn't discover things by hovering
              a cursor over them. Deliberately white-on-black rather than
              themed: it sits on top of an arbitrary photo, where the site's
              surface tokens can't promise any contrast. */}
          <span
            aria-hidden
            className='pointer-events-none absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none md:top-3 md:right-3'
          >
            <Expand className='size-3.5' />
            Expand
          </span>
        </button>
      </DialogPrimitive.Trigger>

      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className='fixed inset-0 z-50 bg-black/70 backdrop-blur-sm'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              />
            </DialogPrimitive.Overlay>

            {/* The picture carries no text of its own, so the alt text is the
                dialog's accessible name. `aria-describedby={undefined}` opts
                out of Radix's missing-Description warning - the caption, where
                there is one, is right there on screen. */}
            <DialogPrimitive.Content
              asChild
              forceMount
              aria-describedby={undefined}
            >
              <motion.figure
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
                // `h-dvh` rather than the height `inset-0` would give it: the
                // picture's size is spent in dvh above, and on a phone with
                // retracting browser chrome a fixed element's own height and
                // 100dvh aren't always the same number - pinning it makes the
                // two agree by construction. `top` and `bottom` together with
                // an explicit height would be over-constrained, so this
                // anchors at the top and sizes down from there.
                className='fixed inset-x-0 top-0 z-50 m-0 flex h-dvh flex-col items-center justify-center gap-3 p-4'
                // Dismissal is hand-rolled rather than left to Radix's
                // outside-click detection, because this layer covers the whole
                // backdrop: nothing a visitor clicks is ever "outside" the
                // dialog as far as Radix can tell. Everything that isn't the
                // picture or its caption counts as backdrop - including the
                // space either side of a tall photo, which is exactly where
                // someone reaching for "get me out of here" clicks.
                //
                // pointerdown rather than click, same reason as ReferenceModal:
                // a drag that starts on the picture and ends out on the
                // backdrop fires a click targeted at this layer, so testing
                // the click would dismiss a gesture that began on the image.
                // pointerdown asks where the gesture started, which is the
                // question actually being asked here.
                onPointerDown={(event) => {
                  const target = event.target as Node;
                  const onPicture = pictureRef.current?.contains(target);
                  const onCaption = captionRef.current?.contains(target);
                  if (!onPicture && !onCaption) setOpen(false);
                }}
              >
                <VisuallyHidden>
                  <DialogPrimitive.Title>{alt}</DialogPrimitive.Title>
                </VisuallyHidden>

                <DialogPrimitive.Close
                  aria-label='Close'
                  className='focus-visible:ring-ring bg-background/80 text-foreground/80 hover:bg-accent hover:text-foreground absolute top-4 right-4 z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition focus-visible:ring-2 focus-visible:outline-hidden active:scale-95 motion-reduce:transition-none'
                >
                  <X className='size-5' />
                </DialogPrimitive.Close>

                <Image
                  ref={pictureRef}
                  src={src}
                  alt={alt}
                  width={width}
                  height={height}
                  // It's the largest thing on the screen by construction, so
                  // there's no smaller candidate worth describing. Next caps
                  // the request at the source file's own width regardless.
                  sizes='100vw'
                  quality={LIGHTBOX_QUALITY}
                  style={{ width: pictureWidth }}
                  className='h-auto rounded-lg shadow-2xl'
                />

                {caption && (
                  <figcaption
                    ref={captionRef}
                    className='max-w-2xl text-center text-sm text-white/80'
                  >
                    {caption}
                  </figcaption>
                )}
              </motion.figure>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
