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

export function TechStack() {
  return (
    <section id="tech" className={styles.section}>
      <p className={styles.eyebrow}>Built with</p>
      <div className={styles.row}>
        {TECH.map((name, i) => (
          <motion.span
            key={name}
            className={styles.badge}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-20px' }}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20, delay: i * 0.04 }}
          >
            {name}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
