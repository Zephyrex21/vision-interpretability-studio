import { motion } from 'framer-motion';
import { CheckCircle2, Lock, Puzzle, Sparkles } from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';
import styles from './HowItsBuilt.module.css';

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: 'Exact Grad-CAM, zero backprop',
    description:
      "This architecture's global-average-pool into a single linear layer means Grad-CAM reduces to a closed-form weighted sum of the last convolution — no gradient computation needed, just one exact forward pass.",
  },
  {
    icon: Puzzle,
    title: 'A hand-ported TF.js ResNet-18',
    description:
      'The Adversarial and Compare tabs need true gradients, so the trained network was manually ported from ONNX into TensorFlow.js — weight-layout transpose and all — then numerically verified to 6 decimal places against the original.',
  },
  {
    icon: Lock,
    title: '100% client-side',
    description:
      'ONNX Runtime Web and TensorFlow.js both run on WebAssembly, in your tab. Your photo is never uploaded anywhere — there is no backend for it to go to.',
  },
  {
    icon: CheckCircle2,
    title: 'Actually tested',
    description:
      '41 unit tests plus a real Playwright suite that opens an actual browser, downloads the actual model, and checks the actual pixels — run in CI on every push, not just claimed in a README.',
  },
];

export function HowItsBuilt() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Under the hood</p>
        <h2 className={styles.title}>Built to be inspected, not just used</h2>
      </div>

      <div className={styles.grid}>
        {HIGHLIGHTS.map((item, i) => (
          <motion.div
            key={item.title}
            style={{ perspective: '1000px' }}
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 210, damping: 20, delay: i * 0.08 }}
          >
            <TiltCard strength={4} className={styles.tiltWrapper}>
              <div className={styles.card}>
                <span className={styles.iconChip} aria-hidden="true">
                  <item.icon size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardDescription}>{item.description}</p>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
