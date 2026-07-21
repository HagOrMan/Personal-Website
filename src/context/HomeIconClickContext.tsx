'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

type HomeIconClickContextValue = {
  /** How many times the navbar home icon has been clicked this "session". */
  clickCount: number;
  /** Increments on every click (even across resets) so effects can key off a fresh click. */
  lastClickId: number;
  registerClick: () => void;
  resetClicks: () => void;
};

const HomeIconClickContext = createContext<HomeIconClickContextValue | null>(
  null,
);

/**
 * Shares home-icon click state between the Navbar (where the icon lives) and
 * the homepage (which reacts to it), since the two are rendered as siblings
 * under PageLayout rather than in a parent/child relationship.
 */
export function HomeIconClickProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickId, setLastClickId] = useState(0);

  const registerClick = useCallback(() => {
    setClickCount((count) => count + 1);
    setLastClickId((id) => id + 1);
  }, []);

  const resetClicks = useCallback(() => {
    setClickCount(0);
  }, []);

  return (
    <HomeIconClickContext.Provider
      value={{ clickCount, lastClickId, registerClick, resetClicks }}
    >
      {children}
    </HomeIconClickContext.Provider>
  );
}

export function useHomeIconClick() {
  const context = useContext(HomeIconClickContext);
  if (!context) {
    throw new Error(
      'useHomeIconClick must be used within a HomeIconClickProvider',
    );
  }
  return context;
}
