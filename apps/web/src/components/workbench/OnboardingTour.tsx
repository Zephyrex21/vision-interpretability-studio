import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './OnboardingTour.module.css';

const HIGHLIGHTS = [
  { label: 'Grad-CAM', blurb: 'Upload any photo — see exactly what the model looked at, live.' },
  { label: 'Layers', blurb: 'Scrub through network depth: edges → textures → whole objects.' },
  { label: 'Features', blurb: 'Browse what individual filters have learned to detect.' },
  { label: 'Adversarial', blurb: 'A barely-visible pixel nudge that flips a confident answer.' },
  { label: 'Compare', blurb: 'Live Grad-CAM next to a precomputed Grad-CAM++ result.' },
];

interface OnboardingTourProps {
  open: boolean;
  onDismiss: () => void;
}

/**
 * Presentational only — first-visit auto-show and the header's re-open
 * button both live in `useOnboardingTour`, so there's one source of truth
 * for whether this is open, not a local `useState` here that a re-open
 * button elsewhere would have no way to trigger.
 */
export function OnboardingTour({ open, onDismiss }: OnboardingTourProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onDismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className={styles.card}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.eyebrow}>Welcome</p>
            <h2 id="onboarding-title" className={styles.title}>
              See inside a real vision model
            </h2>
            <p className={styles.intro}>
              Everything here runs live in your browser — a ResNet-18 trained from scratch,
              genuinely inspecting whatever image you give it. No servers, no uploads leaving your
              device.
            </p>

            <ul className={styles.list}>
              {HIGHLIGHTS.map((h) => (
                <li key={h.label} className={styles.listItem}>
                  <span className={styles.listLabel}>{h.label}</span>
                  <span className={styles.listBlurb}>{h.blurb}</span>
                </li>
              ))}
            </ul>

            <button
              ref={closeButtonRef}
              type="button"
              className={styles.dismissButton}
              onClick={onDismiss}
            >
              Start exploring
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
