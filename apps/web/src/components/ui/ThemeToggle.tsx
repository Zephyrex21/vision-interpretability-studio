import { motion } from 'framer-motion';
import { useTheme } from '../../state/ThemeContext';
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
      <motion.span
        className={styles.knob}
        animate={{ x: isDark ? 0 : 22 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      />
      <span className={styles.label}>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
