import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, ChevronDown, Code2, Cpu, Percent } from 'lucide-react';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { NetworkDiagram } from './NetworkDiagram';
import styles from './Hero.module.css';

const GITHUB_URL = 'https://github.com/Zephyrex21/vision-interpretability-studio';

const HEADLINE_WORDS = ['Watch', 'a', 'neural', 'network', 'think.'];

const STATS = [
  {
    icon: Percent,
    value: 88,
    suffix: '% val accuracy',
    title: 'ResNet-18 trained from scratch on Imagenette',
  },
  {
    icon: Boxes,
    value: 5,
    suffix: ' techniques',
    title: 'Grad-CAM, layers, features, adversarial, compare',
  },
  {
    icon: Cpu,
    value: 0,
    suffix: ' backend servers',
    title: 'Every model runs entirely in your browser',
  },
];

const PARTICLES = [
  { top: '6%', left: '-6%', size: 8, duration: 4.2, delay: 0 },
  { top: '78%', left: '-3%', size: 5, duration: 5.1, delay: 0.6 },
  { top: '14%', left: '104%', size: 6, duration: 4.7, delay: 1.1 },
  { top: '86%', left: '100%', size: 9, duration: 3.9, delay: 0.3 },
  { top: '46%', left: '108%', size: 4, duration: 5.6, delay: 1.6 },
];

export function Hero() {
  const statsRef = useRef<HTMLDListElement>(null);

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

          <h1 className={styles.title}>
            {HEADLINE_WORDS.map((word, i) => (
              <span key={i} className={styles.wordMask}>
                <motion.span
                  className={styles.word}
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{
                    duration: 0.65,
                    ease: [0.2, 0.65, 0.3, 0.9],
                    delay: 0.15 + i * 0.07,
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            A ResNet-18 trained from scratch, inspected live — five interactive ways to see exactly
            what it looked at and why it answered the way it did. No server, no upload, no waiting
            on a queue: the model runs in your tab.
          </motion.p>

          <motion.div
            className={styles.ctaRow}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
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

          <dl className={styles.stats} ref={statsRef}>
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.suffix}
                className={styles.stat}
                title={stat.title}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.8 + i * 0.08 }}
              >
                <stat.icon size={14} strokeWidth={2} className={styles.statIcon} />
                <dd className={styles.statLabel}>
                  <AnimatedCounter value={stat.value} containerRef={statsRef} />
                  {stat.suffix}
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>

        <motion.div
          className={styles.visual}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className={styles.visualCardWrap}>
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className={styles.particle}
                aria-hidden="true"
                style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
                animate={{ y: [0, -14, 0], opacity: [0.25, 0.8, 0.25] }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            <div className={styles.visualCard}>
              <NetworkDiagram />
              <span className={styles.visualChip}>ResNet-18 · trained from scratch</span>
            </div>
          </div>
          <span className={styles.visualCaption}>
            An illustration of the network — inspect the real one live
          </span>
        </motion.div>
      </div>

      <motion.div
        className={styles.scrollCue}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 1.2 },
          y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 },
        }}
        aria-hidden="true"
      >
        <ChevronDown size={20} strokeWidth={1.8} />
      </motion.div>
    </section>
  );
}
