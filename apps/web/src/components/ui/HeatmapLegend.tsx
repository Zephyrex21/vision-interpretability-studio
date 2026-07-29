import styles from './HeatmapLegend.module.css';

interface HeatmapLegendProps {
  /** Defaults to the generic "activity" framing; override for class-specific
   * contexts like Grad-CAM, where "attention" reads more accurately. */
  label?: string;
  className?: string;
}

export function HeatmapLegend({
  label = 'low activity → high activity',
  className,
}: HeatmapLegendProps) {
  return (
    <div className={`${styles.legend} ${className ?? ''}`}>
      <span className={styles.swatch} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
