import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Flame,
  GitCompare,
  LayoutGrid,
  Layers as LayersIcon,
  ShieldAlert,
} from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';
import styles from './FeatureGrid.module.css';

const FEATURES = [
  {
    tab: 'gradcam',
    icon: Flame,
    title: 'Grad-CAM',
    description:
      'See exactly which pixels drove the answer — an exact forward-only computation for this architecture, not an approximation layered on top.',
  },
  {
    tab: 'layers',
    icon: LayersIcon,
    title: 'Layers',
    description:
      "Scrub through the network's depth and watch attention sharpen from broad shapes into fine, specific detail.",
  },
  {
    tab: 'features',
    icon: LayoutGrid,
    title: 'Features',
    description:
      'Browse a gallery of what individual filters inside the network learned to detect, layer by layer.',
  },
  {
    tab: 'adversarial',
    icon: ShieldAlert,
    title: 'Adversarial',
    description:
      'Watch a nudge invisible to the human eye flip a confident, correct prediction into a confidently wrong one.',
  },
  {
    tab: 'compare',
    icon: GitCompare,
    title: 'Compare',
    description:
      'Live Grad-CAM against a precomputed Grad-CAM++ computed with true gradients through the whole network.',
  },
] as const;

export function FeatureGrid() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Five ways to see inside</p>
        <h2 className={styles.title}>Every angle the model has to offer</h2>
        <p className={styles.description}>
          Each tab is a different lens on the same trained network — pick one below to jump straight
          in.
        </p>
      </div>

      <div className={styles.grid}>
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.tab}
            className={styles.gridItem}
            style={{ perspective: '1000px' }}
            initial={{ opacity: 0, y: 44, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 210, damping: 20, delay: i * 0.08 }}
          >
            <TiltCard className={styles.tiltWrapper}>
              <Link to={`/app?tab=${feature.tab}`} className={styles.card}>
                <span className={styles.iconChip} aria-hidden="true">
                  <feature.icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDescription}>{feature.description}</p>
                <span className={styles.cardLink}>
                  Try it
                  <ArrowRight size={14} strokeWidth={2} />
                </span>
              </Link>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
