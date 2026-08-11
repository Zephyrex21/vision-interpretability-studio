import { motion } from 'framer-motion';
import styles from './ProbabilityChart.module.css';

interface ProbabilityChartProps {
  /** Aligned with CLASS_LABELS — one probability per class, summing to ~1. */
  probabilities: number[];
  labels: string[];
  topN?: number;
  className?: string;
}

/**
 * classifyWithGradCam has always returned the full softmax distribution
 * across all classes, not just the winning one — this is the first place
 * anything actually shows it. Useful specifically when the model is
 * genuinely torn between two similar classes (two tench photos, a church
 * vs. another building) rather than confidently certain, which a single
 * "94% chain saw" line can't distinguish from "94% chain saw, 4% garbage
 * truck, 2% everything else."
 */
export function ProbabilityChart({
  probabilities,
  labels,
  topN = 5,
  className,
}: ProbabilityChartProps) {
  const ranked = labels
    .map((label, index) => ({ label, value: probabilities[index] ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);

  return (
    <div className={`${styles.chart} ${className ?? ''}`}>
      {ranked.map((entry, i) => (
        <div key={entry.label} className={styles.row}>
          <span className={styles.label}>{entry.label}</span>
          <div className={styles.track}>
            <motion.div
              className={`${styles.fill} ${i === 0 ? styles.fillTop : ''}`}
              initial={{ width: 0 }}
              animate={{ width: `${entry.value * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0.65, 0.3, 0.9] }}
            />
          </div>
          <span className={styles.value}>{(entry.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}
