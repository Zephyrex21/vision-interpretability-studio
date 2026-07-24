import { useState } from 'react';
import adversarialMetadata from '../../data/adversarialMetadata.json';
import styles from './AdversarialView.module.css';

interface AdversarialEntry {
  sample_index: number;
  true_label: string;
  epsilon: number;
  clean_prediction: string;
  clean_confidence: number;
  adversarial_prediction: string;
  adversarial_confidence: number;
  flipped: boolean;
  clean_file: string;
  adversarial_file: string;
  diff_file: string;
}

const ENTRIES = adversarialMetadata as AdversarialEntry[];
const EPSILON = ENTRIES[0]?.epsilon ?? 0.03;
const FLIPPED_COUNT = ENTRIES.filter((e) => e.flipped).length;

function compareUrl(file: string): string {
  return `/models/compare/${file}`;
}

export function AdversarialView() {
  const [revealPct, setRevealPct] = useState<Record<number, number>>({});

  const getReveal = (idx: number) => revealPct[idx] ?? 50;

  return (
    <div className={styles.container}>
      <p className={styles.intro}>
        Each pair below was generated once, on Kaggle, using the Fast Gradient Sign Method: every
        pixel nudged by at most <strong>ε = {EPSILON}</strong> — roughly{' '}
        {(EPSILON * 100).toFixed(0)}% of full brightness — in the direction that most confuses the
        model. Drag the slider to compare clean vs. adversarial.{' '}
        <strong>
          {FLIPPED_COUNT}/{ENTRIES.length}
        </strong>{' '}
        predictions flipped, several with over 90% confidence in the wrong answer.
      </p>

      <div className={styles.grid}>
        {ENTRIES.map((entry) => {
          const reveal = getReveal(entry.sample_index);
          return (
            <div key={entry.sample_index} className={styles.card}>
              <div
                className={styles.sliderWrapper}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  setRevealPct((prev) => ({
                    ...prev,
                    [entry.sample_index]: Math.min(100, Math.max(0, pct)),
                  }));
                }}
              >
                <img src={compareUrl(entry.clean_file)} alt="clean" className={styles.baseImage} />
                <div
                  className={styles.overlayClip}
                  style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}
                >
                  <img
                    src={compareUrl(entry.adversarial_file)}
                    alt="adversarial"
                    className={styles.baseImage}
                  />
                </div>
                <div className={styles.sliderHandle} style={{ left: `${reveal}%` }} />
                <span className={styles.sideLabel} style={{ left: 8 }}>
                  clean
                </span>
                <span className={styles.sideLabel} style={{ right: 8 }}>
                  adversarial
                </span>
              </div>

              <div className={styles.meta}>
                <div className={styles.predictionRow}>
                  <span className={!entry.flipped ? styles.predictionOk : styles.predictionMuted}>
                    {entry.clean_prediction} {(entry.clean_confidence * 100).toFixed(0)}%
                  </span>
                  <span className={styles.arrow}>→</span>
                  <span className={entry.flipped ? styles.predictionFlipped : styles.predictionOk}>
                    {entry.adversarial_prediction} {(entry.adversarial_confidence * 100).toFixed(0)}
                    %
                  </span>
                </div>
                {entry.flipped && <span className={styles.flippedBadge}>flipped</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
