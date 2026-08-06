import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Code2, Cpu, Percent } from 'lucide-react';
import styles from './Hero.module.css';

const GITHUB_URL = 'https://github.com/Zephyrex21/vision-interpretability-studio';

const STATS = [
  {
    icon: Percent,
    label: '88% val accuracy',
    title: 'ResNet-18 trained from scratch on Imagenette',
  },
  { icon: Boxes, label: '5 techniques', title: 'Grad-CAM, layers, features, adversarial, compare' },
  { icon: Cpu, label: '0 backend servers', title: 'Every model runs entirely in your browser' },
];

export function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.layout}>
        <div className={styles.text}>
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className={styles.eyebrowDot} aria-hidden="true" />
            100% client-side · runs entirely in your browser
          </motion.span>

          <motion.h1
            className={styles.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            Watch a neural network think.
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            A ResNet-18 trained from scratch, inspected live — five interactive ways to see exactly
            what it looked at and why it answered the way it did. No server, no upload, no waiting
            on a queue: the model runs in your tab.
          </motion.p>

          <motion.div
            className={styles.ctaRow}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Link to="/app" className={styles.primaryCta}>
              Launch the Studio
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryCta}
            >
              <Code2 size={16} strokeWidth={1.8} />
              View on GitHub
            </a>
          </motion.div>

          <motion.dl
            className={styles.stats}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.stat} title={stat.title}>
                <stat.icon size={14} strokeWidth={2} className={styles.statIcon} />
                <dd className={styles.statLabel}>{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          className={styles.visual}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className={`${styles.visualCard} glass-panel`}>
            <img
              src="/samples/sample_00_chain_saw.jpg"
              alt=""
              className={styles.visualImage}
              aria-hidden="true"
            />
            <div className={styles.heatOverlay} aria-hidden="true" />
            <span className={styles.visualChip}>Grad-CAM · chain saw</span>
          </div>
          <span className={styles.visualCaption}>
            An illustration of the Grad-CAM tab — try it live with your own photo
          </span>
        </motion.div>
      </div>
    </section>
  );
}
