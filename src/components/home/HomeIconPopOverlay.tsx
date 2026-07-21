'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { motion } from 'motion/react';

type HomeIconPopOverlayProps = {
  /** Bump this (e.g. an ever-increasing id) to spawn a new pop animation. */
  triggerId: number;
};

/**
 * Renders the site favicon jumping up from the middle of the screen each
 * time `triggerId` changes. Purely decorative feedback for repeated clicks
 * on the navbar home icon.
 */
export function HomeIconPopOverlay({ triggerId }: HomeIconPopOverlayProps) {
  const [pops, setPops] = useState<number[]>([]);

  useEffect(() => {
    if (triggerId === 0) return;
    setPops((current) => [...current, triggerId]);
  }, [triggerId]);

  const removePop = (id: number) => {
    setPops((current) => current.filter((popId) => popId !== id));
  };

  return (
    <div className='pointer-events-none fixed inset-0 z-40 flex items-center justify-center'>
      {pops.map((id) => (
        <motion.div
          key={id}
          className='absolute'
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: [0, 1, 1, 0], y: [100, -100, -20] }}
          transition={{
            y: {
              duration: 1,
              times: [0, 0.35, 0.7],
              ease: ['easeOut', 'easeInOut'],
            },
            opacity: {
              duration: 1,
              times: [0, 0.35, 0.55, 0.7],
              ease: ['easeOut', 'easeInOut', 'easeIn'],
            },
          }}
          onAnimationComplete={() => removePop(id)}
        >
          <Image
            src='/svg/favicon.svg'
            alt=''
            width={64}
            height={64}
            priority
          />
        </motion.div>
      ))}
    </div>
  );
}
