import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type TGlitchTextCycle = {
  words: string[];
  duration?: number;
  glitchDuration?: number;
  className?: string;
  style?: object;
};

export const GlitchTextCycle = ({
  words,
  duration = 3000,
  glitchDuration = 500,
  className,
  style = {},
}: TGlitchTextCycle) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayText, setDisplayText] = useState(words[0]);
  const [glitchText, setGlitchText] = useState('');
  const intervalRef = useRef(null);
  const glitchIntervalRef = useRef(null);

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

  const scrambleText = (originalText, intensity = 0.3) => {
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

  const startGlitch = () => {
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
        clearInterval(glitchIntervalRef.current);
        setDisplayText(nextWord);
        setGlitchText('');
        setIsGlitching(false);
        setCurrentWordIndex(nextIndex);
      }
    }, glitchDuration / totalSteps);
  };

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
  }, [currentWordIndex, duration, glitchDuration, words]);

  useEffect(() => {
    setDisplayText(words[0]);
  }, [words]);

  return (
    <div className={cn('relative inline-block', className)} style={style}>
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
            className='absolute top-0 left-0 z-5 text-4xl font-bold tracking-wider text-red-500 opacity-70'
            style={{
              transform: 'translate(-2px, 0)',
              clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
            }}
          >
            {glitchText || displayText}
          </span>

          <span
            className='absolute top-0 left-0 z-5 text-4xl font-bold tracking-wider text-cyan-500 opacity-70'
            style={{
              transform: 'translate(2px, 0)',
              clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
            }}
          >
            {glitchText || displayText}
          </span>

          <span
            className='absolute top-0 left-0 z-5 text-4xl font-bold tracking-wider text-yellow-400 opacity-50'
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

      <style jsx>{`
        @keyframes glitch-skew {
          0% {
            transform: skew(0deg);
          }
          10% {
            transform: skew(2deg);
          }
          20% {
            transform: skew(-1deg);
          }
          30% {
            transform: skew(1deg);
          }
          40% {
            transform: skew(-2deg);
          }
          50% {
            transform: skew(1deg);
          }
          60% {
            transform: skew(-1deg);
          }
          70% {
            transform: skew(0deg);
          }
          80% {
            transform: skew(1deg);
          }
          90% {
            transform: skew(-1deg);
          }
          100% {
            transform: skew(0deg);
          }
        }

        @keyframes glitch-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

// Demo component showing different usage examples
const GlitchTextDemo = () => {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-12 bg-black p-8'>
      <div className='text-center'>
        <h1 className='mb-8 text-2xl text-white'>Glitch Text Component Demo</h1>

        {/* Default glitch */}
        <div className='mb-8'>
          <p className='mb-4 text-sm text-gray-400'>Default Settings</p>
          <GlitchTextCycle />
        </div>

        {/* Custom words with faster glitch */}
        <div className='mb-8'>
          <p className='mb-4 text-sm text-gray-400'>
            Custom Words - Fast Glitch
          </p>
          <GlitchTextCycle
            words={['REACT', 'NEXTJS', 'TAILWIND', 'AWESOME']}
            duration={2000}
            glitchDuration={300}
            className='text-green-400'
          />
        </div>

        {/* Slower, more dramatic glitch */}
        <div className='mb-8'>
          <p className='mb-4 text-sm text-gray-400'>Dramatic Glitch</p>
          <GlitchTextCycle
            words={['CYBERPUNK', 'MATRIX', 'DIGITAL', 'FUTURE']}
            duration={4000}
            glitchDuration={800}
            className='text-5xl text-purple-400'
          />
        </div>

        {/* Single word (no cycling) */}
        <div className='mb-8'>
          <p className='mb-4 text-sm text-gray-400'>Static Text</p>
          <GlitchTextCycle words={['STATIC']} className='text-red-400' />
        </div>
      </div>

      <div className='max-w-2xl text-center'>
        <h2 className='mb-4 text-xl text-white'>Usage</h2>
        <div className='rounded-lg bg-gray-900 p-4 text-left'>
          <code className='text-sm text-green-400'>
            {`<GlitchText 
  words={['WORD1', 'WORD2', 'WORD3']}
  duration={3000}        // Time between glitches
  glitchDuration={500}   // How long glitch lasts  
  className="text-blue-400"
/>`}
          </code>
        </div>
      </div>
    </div>
  );
};
