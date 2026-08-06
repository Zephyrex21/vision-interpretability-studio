import { Eye, Code2 } from 'lucide-react';
import styles from './Footer.module.css';

const GITHUB_URL = 'https://github.com/Zephyrex21/vision-interpretability-studio';
const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <span className={styles.brandIcon} aria-hidden="true">
            <Eye size={13} strokeWidth={2} />
          </span>
          <span className={styles.brandName}>Vision Interpretability Studio</span>
        </div>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          <Code2 size={15} strokeWidth={1.8} />
          Source on GitHub
        </a>
      </div>

      <div className={styles.bottomRow}>
        <p className={styles.copyright}>&copy; {YEAR} Zephyrex21 &middot; MIT licensed</p>
        <p className={styles.privacyNote}>
          No backend, no accounts, no analytics on your photos — everything above runs in your
          browser.
        </p>
      </div>
    </footer>
  );
}
