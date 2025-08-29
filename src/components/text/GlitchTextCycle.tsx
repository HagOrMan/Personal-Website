import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type TGlitchTextCycle = {
  words: string[];
  duration?: number;
  glitchDuration?: number;
  className?: string;
  style?: object;
};

/**
 *
 * @param words Words to rotate between
 * @param duration time between glitches
 * @param glitchDuration how long glitch lasts
 * @param className extra classname for the outer component
 */
export const GlitchTextCycle = ({
  words,
  duration = 3000,
  glitchDuration = 500,
  className,
}: TGlitchTextCycle) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayText, setDisplayText] = useState(words[0]);
  const [glitchText, setGlitchText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const glitchIntervalRef = useRef<NodeJS.Timeout>(null);

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

  /**
   * Scrambles the input text by randomly replacing each character in that text with a glitch character, the likelihood of a replacement dependent on `intensity`
   * @param originalText Text to scramble with glitch characters
   * @param intensity a value from `0` to `1` to determine how likely it is that a character will glitch. Set to `1` to scramble all characters in the glitch
   * @returns
   */
  const scrambleText = (originalText: string, intensity: number = 0.3) => {
    return originalText
      .split('')
      .map((char) => {
        if (Math.random() < intensity) {
          return glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
        return char;
      })
      .join('');
  };

  const startGlitch = useCallback(() => {
    setIsGlitching(true);
    const currentWord = words[currentWordIndex];
    const nextIndex = (currentWordIndex + 1) % words.length;
    const nextWord = words[nextIndex];

    let glitchStep = 0;
    const totalSteps = 20;

    glitchIntervalRef.current = setInterval(() => {
      if (glitchStep < totalSteps / 2) {
        // First half: scramble current word
        setDisplayText(scrambleText(currentWord, 0.5));
        setGlitchText(scrambleText(currentWord, 0.8));
      } else if (glitchStep < totalSteps * 0.75) {
        // Transition phase: mix of both words
        const mixedText =
          Math.random() > 0.5
            ? scrambleText(currentWord, 0.7)
            : scrambleText(nextWord, 0.7);
        setDisplayText(mixedText);
        setGlitchText(scrambleText(nextWord, 1));
      } else {
        // Final phase: settle on next word
        setDisplayText(nextWord);
        setGlitchText(scrambleText(nextWord, 0.2));
      }

      glitchStep++;

      if (glitchStep >= totalSteps) {
        clearInterval(glitchIntervalRef.current!);
        setDisplayText(nextWord);
        setGlitchText('');
        setIsGlitching(false);
        setCurrentWordIndex(nextIndex);
      }
    }, glitchDuration / totalSteps);
  }, [currentWordIndex, glitchDuration, words]);

  useEffect(() => {
    if (words.length > 1) {
      intervalRef.current = setInterval(() => {
        startGlitch();
      }, duration);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      };
    }
  }, [currentWordIndex, duration, glitchDuration, startGlitch, words]);

  useEffect(() => {
    setDisplayText(words[0]);
  }, [words]);

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Main text */}
      <span
        className={cn(
          'relative z-10 text-4xl font-bold tracking-wider',
          isGlitching && 'animate-pulse',
        )}
        style={{
          textShadow: isGlitching
            ? '2px 0 #ff0000, -2px 0 #00ffff, 0 2px #ffff00'
            : 'none',
          animation: isGlitching
            ? 'glitch-skew 0.1s infinite linear alternate-reverse'
            : 'none',
        }}
      >
        {displayText}
      </span>

      {/* Glitch overlay layers */}
      {isGlitching && (
        <>
          <span
            className='text-lush-500 absolute top-0 left-0 z-10 text-4xl font-bold tracking-wider opacity-70'
            style={{
              transform: 'translate(-2px, 0)',
              clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
            }}
          >
            {glitchText || displayText}
          </span>

          <span
            className='text-breeze-500 absolute top-0 left-0 z-10 text-4xl font-bold tracking-wider opacity-70'
            style={{
              transform: 'translate(2px, 0)',
              clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
            }}
          >
            {glitchText || displayText}
          </span>

          <span
            className='text-nebula-500 absolute top-0 left-0 z-10 text-4xl font-bold tracking-wider opacity-50'
            style={{
              transform: 'translate(-1px, 1px)',
              clipPath: 'polygon(0 25%, 100% 25%, 100% 75%, 0 75%)',
            }}
          >
            {scrambleText(displayText, 0.9)}
          </span>
        </>
      )}

      {/* Background glitch bars */}
      {isGlitching && (
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
          <div
            className='absolute h-1 bg-white opacity-10'
            style={{
              width: '120%',
              left: '-10%',
              top: '20%',
              animation: 'glitch-bar 0.2s infinite linear',
            }}
          />
          <div
            className='absolute h-1 bg-white opacity-10'
            style={{
              width: '120%',
              left: '-10%',
              top: '60%',
              animation: 'glitch-bar 0.15s infinite linear reverse',
            }}
          />
          <div
            className='absolute h-1 bg-white opacity-10'
            style={{
              width: '120%',
              left: '-10%',
              top: '80%',
              animation: 'glitch-bar 0.25s infinite linear',
            }}
          />
        </div>
      )}
    </div>
  );
};
