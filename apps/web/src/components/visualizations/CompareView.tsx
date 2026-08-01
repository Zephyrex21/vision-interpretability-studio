import { useEffect, useRef, useState } from 'react';
import { classifyWithGradCam } from '../../lib/onnx/inference';
import { loadImageElement } from '../../lib/onnx/preprocess';
import { renderGradCamOverlay } from '../../lib/gradcam/renderOverlay';
import { SAMPLE_IMAGES, sampleImageUrl } from '../../data/sampleImages';
import gradcamPpMetadata from '../../data/gradcamPpMetadata.json';
import { HeatmapLegend } from '../ui/HeatmapLegend';
import { InfoTip } from '../ui/InfoTip';
import { LiveGradCamPlusPlusPlayground } from './LiveGradCamPlusPlusPlayground';
import styles from './CompareView.module.css';

interface GradCamPpEntry {
  sample_index: number;
  true_label: string;
  predicted_label: string;
  confidence: number;
  correct: boolean;
  file: string;
}

const PP_ENTRIES = gradcamPpMetadata as GradCamPpEntry[];

function compareUrl(file: string): string {
  return `/models/compare/${file}`;
}

function CompareRow({ sampleIndex }: { sampleIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const sample = SAMPLE_IMAGES[sampleIndex];
  const ppEntry = PP_ENTRIES.find((e) => e.sample_index === sampleIndex);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImageElement(sampleImageUrl(sample.filename));
        const result = await classifyWithGradCam(img);
        if (cancelled) return;
        setLabel(result.classification.predictedLabel);
        setConfidence(result.classification.confidence);
        const canvas = canvasRef.current;
        if (canvas) renderGradCamOverlay(canvas, img, result.gradcam, { size: 240 });
        setStatus('ready');
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleIndex]);

  if (!ppEntry) return null;

  return (
    <div className={styles.row}>
      <div className={styles.pair}>
        <div className={styles.panel}>
          <canvas ref={canvasRef} className={styles.canvas} />
          <span className={styles.panelLabel}>Grad-CAM (live)</span>
        </div>
        <div className={styles.panel}>
          <img src={compareUrl(ppEntry.file)} alt="" className={styles.canvas} />
          <span className={styles.panelLabel}>Grad-CAM++ (precomputed)</span>
        </div>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.trueLabel}>{sample.label}</span>
        <span className={styles.predictions}>
          {status === 'loading' && 'running live inference…'}
          {status === 'error' && 'failed to load'}
          {status === 'ready' && label && (
            <>
              live: <strong>{label}</strong> {((confidence ?? 0) * 100).toFixed(0)}% · precomputed:{' '}
              <strong>{ppEntry.predicted_label}</strong> {(ppEntry.confidence * 100).toFixed(0)}%
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function CompareView() {
  return (
    <div className={styles.container}>
      <p className={styles.intro}>
        The left heatmap in each pair is computed fresh, right now, in your browser — the same
        exact-Grad-CAM technique from the Grad-CAM tab. The right heatmap was precomputed on Kaggle
        using{' '}
        <InfoTip definition="A refinement of Grad-CAM that weighs each pixel's contribution more precisely — most useful when a photo contains several examples of the same object.">
          Grad-CAM++
        </InfoTip>
        , which needs real{' '}
        <InfoTip definition="The calculus step that tells a model how to adjust — required to compute Grad-CAM++, and something the fast engine used elsewhere in this app can't do, since it only runs predictions, not attacks.">
          gradients
        </InfoTip>{' '}
        through the whole network — ONNX Runtime, the fast engine used everywhere else in this app,
        can only run predictions, not compute those gradients. (The playground below runs a second,
        slower engine that can, live, for any photo.) They usually agree closely, since this
        architecture makes standard Grad-CAM already exact — Grad-CAM++'s extra machinery mainly
        helps when an image contains multiple instances of the same class.
      </p>
      <HeatmapLegend />
      <div className={styles.list}>
        {PP_ENTRIES.map((entry) => (
          <CompareRow key={entry.sample_index} sampleIndex={entry.sample_index} />
        ))}
      </div>

      <LiveGradCamPlusPlusPlayground />
    </div>
  );
}
