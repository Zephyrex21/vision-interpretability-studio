import { useCallback, useRef, useState } from 'react';
import { CloudDownload, Loader2, SlidersHorizontal, Sparkles, Upload } from 'lucide-react';
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

const DEFAULT_EPSILON = 0.03;
const EPSILON_MIN = 0.005;
const EPSILON_MAX = 0.1;
const EPSILON_STEP = 0.005;

const STATUS_COPY: Record<Status, string> = {
  idle: 'Click to upload a photo',
  'loading-engine': 'Downloading the attack engine (43MB, one-time)…',
  running: 'Computing a real gradient-based attack…',
  ready: 'Click to try a different photo',
  error: 'Something went wrong — click to try again',
};

export function LiveFgsmPlayground() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<LiveResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [epsilon, setEpsilon] = useState(DEFAULT_EPSILON);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The last successfully loaded image, kept around so moving the epsilon
  // slider can re-run the attack against the same photo without asking
  // for a re-upload.
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const lastRunEpsilonRef = useRef<number>(DEFAULT_EPSILON);

  const runAttack = useCallback(async (img: HTMLImageElement, eps: number) => {
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

      const outcome = await runLiveFgsm(img, eps);
      lastRunEpsilonRef.current = eps;

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
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Could not load that image'));
          img.src = url;
        });
        loadedImageRef.current = img;
        await runAttack(img, epsilon);
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
        setStatus('error');
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [epsilon, runAttack],
  );

  const isBusy = status === 'loading-engine' || status === 'running';

  // Range inputs: React's onChange fires continuously while dragging (it's
  // actually wired to the native 'input' event, not 'change') — perfect for
  // the live displayed number, wrong for triggering a real forward+backward
  // pass on every tick. Recomputation only happens once the value settles,
  // via onMouseUp/onTouchEnd/onKeyUp, and reads straight off the DOM
  // element rather than the epsilon state to sidestep any stale-closure
  // risk from React's async state batching.
  const commitEpsilon = useCallback(
    (value: number) => {
      if (!loadedImageRef.current || isBusy) return;
      if (value === lastRunEpsilonRef.current) return;
      void runAttack(loadedImageRef.current, value);
    },
    [isBusy, runAttack],
  );

  return (
    <div className={`${styles.container} glass-panel`}>
      <div className={styles.heading}>
        <Sparkles size={16} strokeWidth={1.8} className={styles.headingIcon} aria-hidden="true" />
        <h3 className={styles.title}>Try it on your own photo</h3>
      </div>
      <p className={styles.description}>
        Everything above uses 10 fixed sample images, fixed at ε = 0.03. This runs a{' '}
        <InfoTip definition="Software that computes gradients — the calculus needed for a real attack — directly in your browser, separate from the faster engine used elsewhere in this app that can only run predictions, not compute attacks.">
          second, independent engine
        </InfoTip>{' '}
        that can compute a genuine attack against any photo you upload, live, in your browser — and
        unlike the gallery above, you can adjust the attack strength yourself. It loads a second
        ~43MB file the first time you use it (cached after that).
      </p>

      <label className={`${styles.uploadZone} ${isBusy ? styles.uploadZoneBusy : ''}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.uploadInput}
          data-testid="fgsm-upload-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {status === 'loading-engine' && (
          <CloudDownload size={18} className={styles.uploadIconAnimated} />
        )}
        {status === 'running' && <Loader2 size={18} className={styles.uploadIconSpin} />}
        {!isBusy && <Upload size={18} strokeWidth={1.8} />}
        <span data-testid="fgsm-status" data-status={status}>
          {STATUS_COPY[status]}
        </span>
      </label>

      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

      {result && (
        <>
          <div className={styles.epsilonRow}>
            <span className={styles.epsilonLabel}>
              <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
              Attack strength
            </span>
            <input
              type="range"
              className={styles.epsilonSlider}
              min={EPSILON_MIN}
              max={EPSILON_MAX}
              step={EPSILON_STEP}
              value={epsilon}
              disabled={isBusy}
              data-testid="fgsm-epsilon-slider"
              onChange={(e) => setEpsilon(Number(e.target.value))}
              onMouseUp={(e) => commitEpsilon(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => commitEpsilon(Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => commitEpsilon(Number((e.target as HTMLInputElement).value))}
              aria-label="Attack strength (epsilon)"
            />
            <InfoTip definition="The Greek letter used for the perturbation budget — how far any single pixel is allowed to shift. Smaller epsilon means a smaller, harder-to-notice change. Release the slider to re-run the attack at the new value.">
              {`ε = ${epsilon.toFixed(3)}`}
            </InfoTip>
          </div>

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
        </>
      )}
    </div>
  );
}
