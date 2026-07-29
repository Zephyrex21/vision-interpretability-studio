import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classifyWithGradCam, CLASS_LABELS } from '../../lib/onnx/inference';
import type { ClassificationResult } from '../../lib/onnx/inference';
import { loadImageElement } from '../../lib/onnx/preprocess';
import { isSessionReady } from '../../lib/onnx/session';
import { renderGradCamOverlay } from '../../lib/gradcam/renderOverlay';
import { SAMPLE_IMAGES, sampleImageUrl } from '../../data/sampleImages';
import { HeatmapLegend } from '../ui/HeatmapLegend';
import { InfoTip } from '../ui/InfoTip';
import styles from './GradCamView.module.css';

type Status = 'idle' | 'loading-model' | 'running' | 'ready' | 'error';

export function GradCamView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [selectedClassOverride, setSelectedClassOverride] = useState<number | null>(null);

  const runInference = useCallback(async (imageUrl: string, targetClassIdx?: number) => {
    // isSessionReady() tells us whether the ~43MB model has already been
    // downloaded and initialized in this page load. First-ever inference
    // triggers that one-time download; every call after reuses the cached
    // session. These are very different wait times and deserve different
    // messages rather than one generic "loading" label.
    setStatus(isSessionReady() ? 'running' : 'loading-model');
    setErrorMessage(null);
    try {
      const img = await loadImageElement(imageUrl);
      const result = await classifyWithGradCam(img, targetClassIdx);
      setClassification(result.classification);

      const canvas = canvasRef.current;
      if (canvas) {
        renderGradCamOverlay(canvas, img, result.gradcam);
      }
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Inference failed');
      setStatus('error');
    }
  }, []);

  const handleSelectSample = useCallback(
    (filename: string) => {
      const url = sampleImageUrl(filename);
      setActiveSource(url);
      setSelectedClassOverride(null);
      void runInference(url);
    },
    [runInference],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setActiveSource(url);
      setSelectedClassOverride(null);
      void runInference(url);
    },
    [runInference],
  );

  const handleClassOverride = useCallback(
    (classIdx: number) => {
      if (!activeSource) return;
      setSelectedClassOverride(classIdx);
      void runInference(activeSource, classIdx);
    },
    [activeSource, runInference],
  );

  // Load the first sample automatically so the tab never opens empty.
  useEffect(() => {
    if (activeSource === null) {
      handleSelectSample(SAMPLE_IMAGES[0].filename);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.canvasArea}>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRef} className={styles.canvas} />
          <AnimatePresence>
            {(status === 'running' || status === 'loading-model') && (
              <motion.div
                className={styles.loadingOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span>
                  {status === 'loading-model'
                    ? 'Downloading the neural network (43MB, one-time)…'
                    : 'Running the network on your image…'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {classification && status !== 'error' && (
          <motion.div
            className={styles.resultCard}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            key={classification.predictedLabel + classification.confidence}
          >
            <div className={styles.resultHeader}>
              <span className={styles.resultLabel}>
                {selectedClassOverride !== null ? 'Attention for' : 'Prediction'}
              </span>
              <span className={styles.resultValue}>
                {classification.predictedLabel}{' '}
                <InfoTip
                  definition="How sure the model is about this answer. A very confident, correct prediction on an easy example is normal — it doesn't mean the result is faked."
                  className={styles.resultConfidence}
                >
                  {`${(classification.confidence * 100).toFixed(1)}%`}
                </InfoTip>
              </span>
            </div>
            <p className={styles.caption}>
              Heatmap shows the exact region driving this classification — computed as a real
              forward pass through the trained weights, not an approximation.
            </p>
            <HeatmapLegend
              label="low attention → high attention"
              className={styles.legendSpacing}
            />
          </motion.div>
        )}

        {status === 'error' && (
          <div className={styles.errorCard}>
            Something went wrong running inference: {errorMessage}
          </div>
        )}
      </div>

      <div className={styles.sidebar}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Sample images</h3>
          <div className={styles.sampleGrid}>
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.filename}
                type="button"
                className={styles.sampleThumb}
                onClick={() => handleSelectSample(sample.filename)}
                aria-label={`Use sample image: ${sample.label}`}
                aria-pressed={activeSource === sampleImageUrl(sample.filename)}
              >
                <img src={sampleImageUrl(sample.filename)} alt={sample.label} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Or upload your own</h3>
          <label className={styles.uploadZone}>
            <input
              type="file"
              accept="image/*"
              className={styles.uploadInput}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <span>Click to upload an image</span>
          </label>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>See attention for a different class</h3>
          <p className={styles.sectionCaption}>
            The model only ever looked for these 10 things — try another to see where it would have
            looked instead.
          </p>
          <div className={styles.classList}>
            {CLASS_LABELS.map((label, idx) => (
              <button
                key={label}
                type="button"
                className={styles.classButton}
                aria-pressed={selectedClassOverride === idx}
                onClick={() => handleClassOverride(idx)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
