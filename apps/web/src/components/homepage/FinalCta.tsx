import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye } from 'lucide-react';
import styles from './FinalCta.module.css';

export function FinalCta() {
  return (
    <section className={styles.section}>
      <motion.div
        className={`${styles.card} glass-panel-strong`}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
      >
        <span className={styles.iconChip} aria-hidden="true">
          <Eye size={22} strokeWidth={1.75} />
        </span>
        <h2 className={styles.title}>Ready to look inside a neural network?</h2>
        <p className={styles.description}>
          No sign-up, no upload, no waiting — pick a sample photo or upload your own and see what it
          saw in seconds.
        </p>
        <Link to="/app" className={styles.cta}>
          Launch the Studio
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </motion.div>
    </section>
  );
}
