import { motion } from 'framer-motion';
import styles from './TechStack.module.css';

const TECH = [
  'React',
  'TypeScript',
  'Vite',
  'ONNX Runtime Web',
  'TensorFlow.js',
  'Framer Motion',
  'Playwright',
  'Vitest',
];

// Rendered twice back-to-back so a CSS animation translating exactly -50%
// loops seamlessly — the viewport's fade mask hides the seam at each edge.
const TRACK = [...TECH, ...TECH];

export function TechStack() {
  return (
    <section id="tech" className={styles.section}>
      <motion.p
        className={styles.eyebrow}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.4 }}
      >
        Built with
      </motion.p>

      <motion.div
        className={styles.viewport}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className={styles.track}>
          {TRACK.map((name, i) => (
            <span key={i} className={styles.badge}>
              {name}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
