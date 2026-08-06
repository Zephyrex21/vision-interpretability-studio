import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye } from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';
import styles from './FinalCta.module.css';

export function FinalCta() {
  return (
    <section className={styles.section}>
      <motion.div
        style={{ perspective: '1200px' }}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <TiltCard strength={3} className={styles.tiltWrapper}>
          <div className={styles.card}>
            <span className={styles.iconChip} aria-hidden="true">
              <Eye size={22} strokeWidth={1.75} />
            </span>
            <h2 className={styles.title}>Ready to look inside a neural network?</h2>
            <p className={styles.description}>
              No sign-up, no upload, no waiting — pick a sample photo or upload your own and see
              what it saw in seconds.
            </p>
            <Link to="/app" className={styles.cta}>
              Launch the Studio
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </TiltCard>
      </motion.div>
    </section>
  );
}
