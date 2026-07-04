'use client';

import { ReactNode } from 'react';

import { AnimatePresence, motion } from 'motion/react';

interface PopCardProps {
  children: ReactNode;
  /** Controls visibility. Flip to false to trigger the shake + pop exit. */
  show: boolean;
  className?: string;
  /** Shake + pop duration in seconds. Default 0.7 */
  duration?: number;
  /** Delay in seconds before the exit (pop) starts — for staggering grids. Default 0 */
  delay?: number;
  /** Delay in seconds before the enter starts. Default 0, so staggered exits still re-enter together. */
  enterDelay?: number;
  /**
   * If true, the popped card keeps occupying its space in the layout
   * (it becomes invisible but is never removed from the DOM). Use this
   * when many cards pop on staggered delays — it prevents the layout
   * from reflowing mid-choreography and shoving still-waiting cards
   * into new positions. Default false (card is removed after popping,
   * appropriate for true list-removal).
   */
  keepSpace?: boolean;
  /** Called after the exit animation (including delay) fully completes. */
  onPopped?: () => void;
}

// Shared shake + pop keyframes.
// Phase 1 (0% → 80%): shake clockwise/counterclockwise, ramping to ±5°,
// while slowly inflating. Phase 2 (80% → 100%): the pop — rapid
// scale-up + fade out.
const POP_ROTATE = [0, -0.5, 0.5, -1.5, 1.5, -3, 3, -3, 0, 0];
const POP_SCALE = [1, 1.01, 1.02, 1.03, 1.04, 1.06, 1.08, 1.1, 1.45, 1.5];
const POP_OPACITY = [1, 1, 1, 1, 1, 1, 1, 1, 0.4, 0];
const POP_TIMES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 0.92, 1];

const ENTER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Self-contained shake-and-pop wrapper. Wrap anything, control it with `show`:
 *
 *   <PopCard show={isVisible} onPopped={() => removeItem(id)}>
 *     <Card />
 *   </PopCard>
 *
 * When `show` flips to false, the content shakes with building intensity
 * (±5°, slowly inflating) and then pops — a rapid scale-up as it fades out.
 *
 * The PopCard itself must stay mounted while the exit plays: toggle `show`
 * rather than unmounting it (and keep its `key` stable), then use `onPopped`
 * to clean up or advance your state once the pop finishes.
 */
export default function PopCard({
  children,
  show,
  className,
  duration = 0.7,
  delay = 0,
  enterDelay = 0,
  keepSpace = false,
  onPopped,
}: PopCardProps) {
  if (keepSpace) {
    // Space-keeping mode: the element is never unmounted. It animates
    // between 'visible' and 'popped' states, and while popped it still
    // occupies its box (invisible, non-interactive) so the surrounding
    // layout never reflows.
    return (
      <motion.div
        className={className}
        initial={false}
        animate={show ? 'visible' : 'popped'}
        variants={{
          visible: {
            // Explicit keyframe start values so re-entry always begins
            // from the small/faded state, not from the popped 1.5 scale.
            opacity: [0, 1],
            scale: [0.9, 1],
            rotate: 0,
            transition: { delay: enterDelay, duration: 0.4, ease: ENTER_EASE },
          },
          popped: {
            rotate: POP_ROTATE,
            scale: POP_SCALE,
            opacity: POP_OPACITY,
            transition: { delay, duration, times: POP_TIMES, ease: 'easeOut' },
          },
        }}
        onAnimationComplete={(definition) => {
          if (definition === 'popped') onPopped?.();
        }}
        style={{
          transformOrigin: 'center',
          pointerEvents: show ? 'auto' : 'none',
        }}
        aria-hidden={!show}
      >
        {children}
      </motion.div>
    );
  }

  // Removal mode: the element unmounts after popping and frees its space.
  return (
    <AnimatePresence onExitComplete={onPopped}>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
            transition: { delay: enterDelay, duration: 0.4, ease: ENTER_EASE },
          }}
          exit={{
            rotate: POP_ROTATE,
            scale: POP_SCALE,
            opacity: POP_OPACITY,
            transition: { delay, duration, times: POP_TIMES, ease: 'easeOut' },
          }}
          style={{ transformOrigin: 'center' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
