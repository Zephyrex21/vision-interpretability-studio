import { useCallback, useRef, useState } from 'react';
import adversarialMetadata from '../../data/adversarialMetadata.json';
import { InfoTip } from '../ui/InfoTip';
import { LiveFgsmPlayground } from './LiveFgsmPlayground';
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

/**
 * One clean/adversarial comparison card with a drag-to-reveal slider.
 *
 * Uses the Pointer Events API (onPointerDown/Move/Up) rather than mouse-only
 * handlers — Pointer Events unify mouse, touch, and pen into one API, which
 * matters here because a plain `onMouseMove` handler never fires on
 * touchscreens at all. Dragging is now the actual interaction on every
 * input type, matching what the intro copy already says ("drag the
 * slider") rather than the previous hover-only behavior, which only worked
 * with a mouse and didn't even match its own instructions.
 */
function AdversarialCard({ entry }: { entry: AdversarialEntry }) {
  const [reveal, setReveal] = useState(50);
  const isDraggingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setReveal(Math.min(100, Math.max(0, pct)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // A ref, not state, gates this check: pointerdown -> pointermove can
    // fire synchronously back-to-back (fast drags, or programmatic/test
    // dispatch), and React state updates from pointerdown aren't guaranteed
    // to have re-rendered yet by the time pointermove's closure runs. A ref
    // mutates immediately, so there's no stale-read window.
    if (!isDraggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className={styles.card}>
      <div
        ref={wrapperRef}
        className={styles.sliderWrapper}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
      >
        <img src={compareUrl(entry.clean_file)} alt="clean" className={styles.baseImage} />
        <div className={styles.overlayClip} style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
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
            {entry.adversarial_prediction} {(entry.adversarial_confidence * 100).toFixed(0)}%
          </span>
        </div>
        {entry.flipped && <span className={styles.flippedBadge}>flipped</span>}
      </div>
    </div>
  );
}

export function AdversarialView() {
  return (
    <div className={styles.container}>
      <p className={styles.intro}>
        Each pair below was generated once, on Kaggle, using the{' '}
        <InfoTip definition="An algorithm that nudges every pixel slightly in whichever direction most confuses the model — named for using only the sign (+/-) of the gradient, not its size.">
          Fast Gradient Sign Method
        </InfoTip>
        : every pixel nudged by at most{' '}
        <InfoTip definition="The Greek letter used for the perturbation budget — how far any single pixel is allowed to shift. Smaller epsilon means a smaller, harder-to-notice change.">
          {`ε = ${EPSILON}`}
        </InfoTip>{' '}
        — roughly {(EPSILON * 100).toFixed(0)}% of full brightness — in the direction that most
        confuses the model. Drag the slider to compare clean vs. adversarial.{' '}
        <strong>
          {FLIPPED_COUNT}/{ENTRIES.length}
        </strong>{' '}
        predictions flipped, several with over 90%{' '}
        <InfoTip definition="How sure the model is about its answer, as a percentage. A confident wrong answer here is exactly what makes this attack concerning.">
          confidence
        </InfoTip>{' '}
        in the wrong answer.
      </p>

      <div className={styles.grid}>
        {ENTRIES.map((entry) => (
          <AdversarialCard key={entry.sample_index} entry={entry} />
        ))}
      </div>

      <LiveFgsmPlayground />
    </div>
  );
}
