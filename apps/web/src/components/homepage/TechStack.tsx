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
        {TECH.map((name) => (
          <span key={name} className={styles.badge}>
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
