'use client';

import { useEffect, useState } from 'react';

import { GlitchText } from '@/components/text/GlitchText';

type TGlitchTextCycle = {
  words: string[];
  glitchDelayMs?: number;
  className?: string;
};

export const GlitchTextCycle = ({
  words,
  glitchDelayMs,
  className,
}: TGlitchTextCycle) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
      },
      (glitchDelayMs ?? 3000) + 1,
    );

    return () => clearInterval(interval);
  });

  return (
    <GlitchText
      text={words[currentIndex]}
      glitchDelayMs={glitchDelayMs}
      className={className}
    />
  );
};
