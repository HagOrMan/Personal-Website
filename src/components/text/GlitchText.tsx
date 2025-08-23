'use client';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type TGlitchText = {
  text: string;
  glitchDelayMs?: number;
  className?: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GlitchText = ({
  text,
  glitchDelayMs = 3000,
  className,
}: TGlitchText) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const glitchCharacters =
    'aAbBefGhkmMnNoOpPqQrRsSuUvVwWxXyYzZ!@#$%^&*()1234567890';

  const scrambleText = useCallback(async () => {
    const characterIndicesToScramble = text.split('').map((_, index) => index); // gets the actual indices that we want to scramble

    // Fisher–Yates shuffle
    for (let i = characterIndicesToScramble.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // pick index from 0..i
      [characterIndicesToScramble[i], characterIndicesToScramble[j]] = [
        characterIndicesToScramble[j],
        characterIndicesToScramble[i],
      ]; // swap
    }

    // For each index (aka character in the text), we make sure it gets scrambled so all characters are scrambled before we settle back on the text.
    for (const indexToScramble of characterIndicesToScramble) {
      const randomNewCharacterIndex = Math.floor(
        Math.random() * glitchCharacters.length,
      );
      setDisplayText(
        (prev) =>
          prev.substring(0, indexToScramble) +
          glitchCharacters[randomNewCharacterIndex] +
          prev.substring(indexToScramble + 1),
      );
      await delay(10);
    }

    // Do the same thing but unscramble
    const characterIndicesToUnscramble = text
      .split('')
      .map((_, index) => index);

    // Fisher–Yates shuffle
    for (let i = characterIndicesToUnscramble.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // pick index from 0..i
      [characterIndicesToUnscramble[i], characterIndicesToUnscramble[j]] = [
        characterIndicesToUnscramble[j],
        characterIndicesToUnscramble[i],
      ]; // swap
    }

    for (const indexToUnscramble of characterIndicesToUnscramble) {
      setDisplayText(
        (prev) =>
          prev.substring(0, indexToUnscramble) +
          text[indexToUnscramble] +
          prev.substring(indexToUnscramble + 1),
      );
      await delay(10);
    }
  }, [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      scrambleText();
    }, glitchDelayMs);

    return () => clearInterval(interval);
  }, [scrambleText, glitchDelayMs]);

  return <div className={cn(className)}>{displayText}</div>;
};
