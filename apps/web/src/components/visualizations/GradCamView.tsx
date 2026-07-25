import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classifyWithGradCam, CLASS_LABELS } from '../../lib/onnx/inference';
import type { ClassificationResult } from '../../lib/onnx/inference';
import { loadImageElement } from '../../lib/onnx/preprocess';
import { renderGradCamOverlay } from '../../lib/gradcam/renderOverlay';
import { SAMPLE_IMAGES, sampleImageUrl } from '../../data/sampleImages';
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
    setStatus(targetClassIdx === undefined ? 'running' : 'running');
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
                <span>{status === 'loading-model' ? 'Loading model…' : 'Running inference…'}</span>
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
                <span className={styles.resultConfidence}>
                  {(classification.confidence * 100).toFixed(1)}%
                </span>
              </span>
            </div>
            <p className={styles.caption}>
              Heatmap shows the exact region driving this classification — computed as a real
              forward pass through the trained weights, not an approximation.
            </p>
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
