import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './InfoTip.module.css';

interface InfoTipProps {
  /** The jargon term itself, e.g. "Fast Gradient Sign Method" — rendered as the tappable text. */
  children: string;
  /** One-line, plain-English definition shown in the popover. */
  definition: string;
  /** Optional extra class for the tappable term, composed alongside the default underline styling. */
  className?: string;
}

/**
 * Wraps a jargon term inline within a sentence. Tap/click toggles a small
 * definition popover — deliberately click-based rather than hover-based,
 * since hover doesn't exist on touch devices (the same lesson learned from
 * the Adversarial tab's drag-to-reveal slider: an interaction that only
 * works with a mouse silently doesn't work at all on a phone).
 */
export function InfoTip({ children, definition, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.term} ${className ?? ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            className={styles.popover}
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            {definition}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
