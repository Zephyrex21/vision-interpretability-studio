import { useCallback, useRef, useState } from 'react';
import { InfoTip } from '../ui/InfoTip';
import styles from './LiveGradCamPlusPlusPlayground.module.css';

type Status = 'idle' | 'loading-engine' | 'running' | 'ready' | 'error';

export function LiveGradCamPlusPlusPlayground() {
  const [status, setStatus] = useState<Status>('idle');
  const [label, setLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const gradcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const gradcamPpCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    try {
      // Both engines are dynamically imported — merely opening the
      // Compare tab (to see the 10 precomputed rows above) must not
      // trigger downloading onnxruntime-web's WASM runtime a second time
      // unnecessarily, nor @tensorflow/tfjs and its ~43MB weights, unless
      // this playground is actually used.
      const [onnxInference, onnxPreprocess, renderOverlay, tfjsLiveInference, tfjsModel] =
        await Promise.all([
          import('../../lib/onnx/inference'),
          import('../../lib/onnx/preprocess'),
          import('../../lib/gradcam/renderOverlay'),
          import('../../lib/tfjs/liveInference'),
          import('../../lib/tfjs/model'),
        ]);

      setStatus(tfjsModel.isTfjsReady() ? 'running' : 'loading-engine');

      const url = URL.createObjectURL(file);
      const img = await onnxPreprocess.loadImageElement(url);

      setStatus('running');

      // Live Grad-CAM (exact, forward-only, ONNX) — fast, and likely
      // already cached if the visitor has used the Grad-CAM tab.
      const gradcamResult = await onnxInference.classifyWithGradCam(img);
      const gradcamCanvas = gradcamCanvasRef.current;
      if (gradcamCanvas) {
        renderOverlay.renderGradCamOverlay(gradcamCanvas, img, gradcamResult.gradcam, {
          size: 280,
        });
      }

      // Live Grad-CAM++ (true gradients, TF.js) — the actual new capability.
      const ppResult = await tfjsLiveInference.runLiveGradCamPlusPlus(img);
      const ppCanvas = gradcamPpCanvasRef.current;
      if (ppCanvas) {
        renderOverlay.renderGradCamOverlay(ppCanvas, img, ppResult.gradcam, { size: 280 });
      }

      setLabel(gradcamResult.classification.predictedLabel);
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
        The rows above compare live Grad-CAM against a Grad-CAM++ that was precomputed on Kaggle for
        10 fixed images. This computes{' '}
        <InfoTip definition="A real gradient computed live in your browser via a second engine (TensorFlow.js), not a lookup from a precomputed file — the same technique used for the Adversarial tab's live attack.">
          true Grad-CAM++
        </InfoTip>{' '}
        for any photo you upload, live. Loads the same ~43MB attack engine as the Adversarial tab's
        live playground (cached after first use).
      </p>

      <label className={styles.uploadZone}>
        <input
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
          {status === 'running' && 'Computing both heatmaps…'}
          {status === 'ready' && 'Click to try a different photo'}
          {status === 'error' && 'Something went wrong — click to try again'}
        </span>
      </label>

      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

      <div className={styles.canvasRow}>
        <div className={styles.panel}>
          <canvas ref={gradcamCanvasRef} className={styles.canvas} />
          <span className={styles.panelLabel}>Grad-CAM (live)</span>
        </div>
        <div className={styles.panel}>
          <canvas ref={gradcamPpCanvasRef} className={styles.canvas} />
          <span className={styles.panelLabel}>Grad-CAM++ (live)</span>
        </div>
      </div>

      {label && status === 'ready' && (
        <p className={styles.prediction}>
          Predicted: <strong>{label}</strong>
        </p>
      )}
    </div>
  );
}
