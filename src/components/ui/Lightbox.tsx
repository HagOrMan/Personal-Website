'use client';

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { usePrefersReducedMotion } from '@/lib/screenUtils';

/**
 * How much vertical space the lightbox spends on things that aren't the
 * picture. Lengths rather than classes because the picture's size is
 * arithmetic, not a percentage - keep these in step with the layer's `p-4`
 * and the figure's `gap-3`.
 */
const LAYER_PADDING_Y = '2rem';
const CAPTION_GAP = '0.75rem';

/**
 * What the caption is worth until the ResizeObserver has measured it: one
 * line of `text-sm`, which is what a caption usually is.
 *
 * A consumer whose strip is taller - /gallery's, which holds 40px paging
 * controls - gets one painted frame at the wrong size before the real
 * measure lands. That frame is the one the figure spends at opacity 0 on its
 * way in, which is why this doesn't need to be a prop or a layout effect.
 */
const CAPTION_FIRST_PAINT_HEIGHT = 20;

export type LightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The dialog's accessible name. A picture carries no text of its own, so
   * whatever names it has to come from the consumer.
   */
  title: string;
  /**
   * The picture's width / height, and the reason every consumer has to know
   * its image's intrinsic size: the enlarged copy is sized off the viewport's
   * *height*, which needs the ratio to solve for a width.
   */
  ratio: number;
  /**
   * The picture. Render it `w-full` - it sits in a wrapper this component
   * sizes, and that wrapper is what the dismiss test treats as "the picture",
   * so nothing needs to thread a ref through.
   */
  children: ReactNode;
  /**
   * Whatever sits under the picture, in the strip the picture gives up for
   * it. A caption, a counter, the controls that change it - the reserve is
   * measured either way, and a pointerdown anywhere in it is exempt from the
   * dismiss, so a control here pages rather than closing.
   */
  caption?: ReactNode;
  /**
   * What opens it, wrapped in Radix's Trigger - which is what buys the
   * aria-expanded/aria-controls pair and focus return for free. Omit it where
   * the dialog is driven from outside by `open`, as a wall of interchangeable
   * triggers has to be.
   */
  trigger?: ReactNode;
  /**
   * Where focus goes on close. Radix hands it back to the Trigger and
   * nowhere else, so a dialog opened without one drops focus to the body
   * unless it names its own element. Left unset, Radix's answer stands.
   */
  restoreFocusTo?: RefObject<HTMLElement | null>;
};

/**
 * The full-screen image viewer, minus the pixels.
 *
 * Everything here is the half that doesn't care what renders the picture: the
 * modal machinery, the arithmetic that makes the picture claim every pixel the
 * viewport has in one dimension or the other, the dismiss gesture, the
 * enter/exit animation and the close button. The consumer supplies the picture
 * element and whatever sits under it - `next/image` on /experience, a
 * hand-built `<picture>` on /gallery.
 *
 * Radix Dialog carries the modal machinery (focus trap, focus return,
 * Escape-to-close, scroll lock, aria-modal, inert background) exactly as it
 * does for ReferenceModal and VideoModalShell.
 */
export function Lightbox({
  open,
  onOpenChange,
  title,
  ratio,
  caption,
  trigger,
  restoreFocusTo,
  children,
}: LightboxProps) {
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

  // The two things a pointerdown can land on that aren't "dismiss this" -
  // see the handler on the figure.
  const pictureRef = useRef<HTMLDivElement>(null);

  const hasCaption = caption != null;

  useEffect(() => {
    // The caption only exists while the lightbox does, so `open` is what runs
    // the first measure on each open rather than something read in here.
    const element = open ? captionRef.current : null;
    if (!element) return;

    const measure = () => setCaptionHeight(element.offsetHeight);
    measure();

    // Rotation, resize, a late font swap, a counter ticking over to a wider
    // number - anything that can change the height, including a change of
    // caption content, which is why that isn't a dependency of its own.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open, hasCaption]);

  const reservedHeight = hasCaption
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}

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

            {/* `aria-describedby={undefined}` opts out of Radix's
                missing-Description warning - the caption, where there is one,
                is right there on screen. */}
            <DialogPrimitive.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // Radix's own handler for this focuses the Trigger, which is
              // the right answer whenever there is one - so the default is
              // only taken off the table when the consumer has named
              // somewhere better. Runs first, and preventing the default is
              // what stops Radix's from running after it.
              onCloseAutoFocus={(event) => {
                const target = restoreFocusTo?.current;
                if (!target) return;
                event.preventDefault();
                target.focus();
              }}
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
                // picture or the strip under it counts as backdrop -
                // including the space either side of a tall photo, which is
                // exactly where someone reaching for "get me out of here"
                // clicks.
                //
                // pointerdown rather than click, same reason as ReferenceModal:
                // a drag that starts on the picture and ends out on the
                // backdrop fires a click targeted at this layer, so testing
                // the click would dismiss a gesture that began on the image.
                // pointerdown asks where the gesture started, which is the
                // question actually being asked here.
                onPointerDown={(event) => {
                  const target = event.target as Node;
                  if (pictureRef.current?.contains(target)) return;
                  if (captionRef.current?.contains(target)) return;
                  onOpenChange(false);
                }}
              >
                <VisuallyHidden>
                  <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
                </VisuallyHidden>

                {/* Deliberately not exempt from the dismiss above: a
                    pointerdown on this should close the viewer, which is
                    what it does either way. */}
                <DialogPrimitive.Close
                  aria-label='Close'
                  className='focus-visible:ring-ring bg-background/80 text-foreground/80 hover:bg-accent hover:text-foreground absolute top-4 right-4 z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition focus-visible:ring-2 focus-visible:outline-hidden active:scale-95 motion-reduce:transition-none'
                >
                  <X className='size-5' />
                </DialogPrimitive.Close>

                {/* `flex` rather than `block` so the picture is blockified and
                    doesn't leave a strip of inline descender space beneath
                    itself - a strip that would sit inside the dismiss-exempt
                    box and throw the centring off by its height. */}
                <div
                  ref={pictureRef}
                  style={{ width: pictureWidth }}
                  className='flex'
                >
                  {children}
                </div>

                {hasCaption && (
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
