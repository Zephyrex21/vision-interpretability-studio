import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.iconChip} aria-hidden="true">
          <Compass size={24} strokeWidth={1.75} />
        </span>
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>This page doesn&rsquo;t exist</h1>
        <p className={styles.description}>
          The link you followed may be broken, or the page may have moved.
        </p>
        <div className={styles.links}>
          <Link to="/" className={styles.primary}>
            Back to homepage
          </Link>
          <Link to="/app" className={styles.secondary}>
            Launch the Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
