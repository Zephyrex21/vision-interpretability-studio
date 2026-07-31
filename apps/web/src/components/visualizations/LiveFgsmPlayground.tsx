import { useCallback, useRef, useState } from 'react';
import { InfoTip } from '../ui/InfoTip';
import styles from './LiveFgsmPlayground.module.css';

type Status = 'idle' | 'loading-engine' | 'running' | 'ready' | 'error';

interface LiveResult {
  cleanLabel: string;
  cleanConfidence: number;
  adversarialLabel: string;
  adversarialConfidence: number;
  cleanCanvasUrl: string;
  adversarialCanvasUrl: string;
  flipped: boolean;
}

const EPSILON = 0.03;

export function LiveFgsmPlayground() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<LiveResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    try {
      // Dynamic import — merely opening the Adversarial tab (to see the
      // precomputed gallery above) must not trigger downloading
      // @tensorflow/tfjs or the ~43MB weight file. Only actually using
      // this playground should.
      const [{ runLiveFgsm }, { isTfjsReady }] = await Promise.all([
        import('../../lib/tfjs/liveInference'),
        import('../../lib/tfjs/model'),
      ]);

      setStatus(isTfjsReady() ? 'running' : 'loading-engine');

      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not load that image'));
        img.src = url;
      });

      setStatus('running');
      const outcome = await runLiveFgsm(img, EPSILON);

      setResult({
        cleanLabel: outcome.clean.predictedLabel,
        cleanConfidence: outcome.clean.confidence,
        adversarialLabel: outcome.adversarial.predictedLabel,
        adversarialConfidence: outcome.adversarial.confidence,
        cleanCanvasUrl: outcome.cleanCanvas.toDataURL(),
        adversarialCanvasUrl: outcome.adversarialCanvas.toDataURL(),
        flipped: outcome.clean.predictedLabel !== outcome.adversarial.predictedLabel,
      });
      setStatus('ready');
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }, []);

  return (
    <div className={`${styles.container} clay-panel`}>
      <h3 className={styles.title}>Try it on your own photo</h3>
      <p className={styles.description}>
        Everything above uses 10 fixed sample images. This runs a{' '}
        <InfoTip definition="Software that computes gradients — the calculus needed for a real attack — directly in your browser, separate from the faster engine used elsewhere in this app that can only run predictions, not compute attacks.">
          second, independent engine
        </InfoTip>{' '}
        that can compute a genuine attack against any photo you upload, live, in your browser. It
        loads a second ~43MB file the first time you use it (cached after that).
      </p>

      <label className={styles.uploadZone}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.uploadInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <span>
          {status === 'idle' && 'Click to upload a photo'}
          {status === 'loading-engine' && 'Downloading the attack engine (43MB, one-time)…'}
          {status === 'running' && 'Computing a real gradient-based attack…'}
          {status === 'ready' && 'Click to try a different photo'}
          {status === 'error' && 'Something went wrong — click to try again'}
        </span>
      </label>

      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

      {result && status === 'ready' && (
        <div className={styles.resultRow}>
          <div className={styles.resultPanel}>
            <img src={result.cleanCanvasUrl} alt="clean" className={styles.resultImage} />
            <span className={styles.resultLabel}>
              {result.cleanLabel} {(result.cleanConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className={styles.resultPanel}>
            <img
              src={result.adversarialCanvasUrl}
              alt="adversarial"
              className={styles.resultImage}
            />
            <span className={result.flipped ? styles.resultLabelFlipped : styles.resultLabel}>
              {result.adversarialLabel} {(result.adversarialConfidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
