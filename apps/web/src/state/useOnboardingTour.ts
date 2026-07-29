import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vis-studio-onboarding-seen';

function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // localStorage unavailable (private browsing, etc.) — fine to skip
    // persistence, the tour will just show again next visit.
  }
}

export interface OnboardingTourState {
  isOpen: boolean;
  openTour: () => void;
  dismissTour: () => void;
}

/**
 * Shows the tour automatically on a first-ever visit (no `localStorage`
 * flag set), and additionally exposes `openTour()` so a persistent header
 * button can reopen it on demand at any time afterward — first-visit
 * auto-show and manual reopen share one source of truth instead of two
 * separate mechanisms.
 */
export function useOnboardingTour(): OnboardingTourState {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setIsOpen(true);
    }
  }, []);

  return {
    isOpen,
    openTour: () => setIsOpen(true),
    dismissTour: () => {
      markOnboardingSeen();
      setIsOpen(false);
    },
  };
}
