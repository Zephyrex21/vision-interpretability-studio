import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../state/useTheme';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-pressed={isDark}
    >
      <Moon size={12} strokeWidth={2} className={styles.trackIcon} aria-hidden="true" />
      <Sun size={12} strokeWidth={2} className={styles.trackIcon} aria-hidden="true" />
      <motion.span
        className={styles.knob}
        animate={{ x: isDark ? 0 : 22 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {isDark ? (
          <Moon size={11} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Sun size={11} strokeWidth={2.2} aria-hidden="true" />
        )}
      </motion.span>
    </button>
  );
}
