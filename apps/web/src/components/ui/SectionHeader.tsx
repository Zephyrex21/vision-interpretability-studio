import type { ComponentType, ReactNode } from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  eyebrow: string;
  title: string;
  description?: ReactNode;
}

/**
 * Every visualization tab opens with one of these: a molded icon chip,
 * a small uppercase eyebrow, a display-font title, and an optional
 * description paragraph. Previously each tab just dropped straight into
 * an intro `<p>` with no heading at all — this gives every tab the same
 * scannable structure (what is this, why does it matter) before the
 * interactive content.
 */
export function SectionHeader({ icon: Icon, eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <span className={styles.iconChip} aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className={styles.text}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </div>
  );
}
