import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudDownload, Flame, Loader2, Upload, Wand2 } from 'lucide-react';
import { classifyWithGradCam, CLASS_LABELS } from '../../lib/onnx/inference';
import type { ClassificationResult } from '../../lib/onnx/inference';
import { loadImageElement } from '../../lib/onnx/preprocess';
import { isSessionReady } from '../../lib/onnx/session';
import { renderGradCamOverlay } from '../../lib/gradcam/renderOverlay';
import { SAMPLE_IMAGES, sampleImageUrl } from '../../data/sampleImages';
import { HeatmapLegend } from '../ui/HeatmapLegend';
import { InfoTip } from '../ui/InfoTip';
import { SectionHeader } from '../ui/SectionHeader';
import { SampleStrip } from '../ui/SampleStrip';
import styles from './GradCamView.module.css';

type Status = 'idle' | 'loading-model' | 'running' | 'ready' | 'error';

export function GradCamView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [activeSampleFilename, setActiveSampleFilename] = useState<string | null>(null);
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
      setActiveSampleFilename(filename);
      setSelectedClassOverride(null);
      void runInference(url);
    },
    [runInference],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setActiveSource(url);
      setActiveSampleFilename(null);
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
      <SectionHeader
        icon={Flame}
        eyebrow="Grad-CAM · exact, forward-only"
        title="See exactly where the model looked"
        description={
          <>
            Upload any photo — or pick a sample below — and watch a real ResNet-18 forward pass
            highlight the exact pixels that drove its answer. This isn't an approximation layered on
            top; it's the network's own attention, mathematically exact for this architecture.
          </>
        }
      />

      <div className={styles.layout}>
        <div className={styles.canvasArea}>
          <div className={styles.canvasWrapper}>
            <canvas ref={canvasRef} className={styles.canvas} data-testid="gradcam-canvas" />
            <AnimatePresence>
              {(status === 'running' || status === 'loading-model') && (
                <motion.div
                  className={styles.loadingOverlay}
                  data-testid="model-loading-overlay"
                  data-loading-kind={status === 'loading-model' ? 'download' : 'inference'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {status === 'loading-model' ? (
                    <CloudDownload size={22} className={styles.loadingIcon} />
                  ) : (
                    <Loader2 size={22} className={styles.loadingSpinner} />
                  )}
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
              className={`${styles.resultCard} glass-panel-strong`}
              data-testid="gradcam-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              key={classification.predictedLabel + classification.confidence}
            >
              <div className={styles.resultHeader}>
                <span className={styles.resultLabel}>
                  {selectedClassOverride !== null ? 'Attention for' : 'Prediction'}
                </span>
                <span className={styles.resultConfidenceChip}>
                  <InfoTip definition="How sure the model is about this answer. A very confident, correct prediction on an easy example is normal — it doesn't mean the result is faked.">
                    {`${(classification.confidence * 100).toFixed(1)}% confident`}
                  </InfoTip>
                </span>
              </div>
              <p className={styles.resultValue}>{classification.predictedLabel}</p>
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
          <div className={`${styles.section} glass-panel`}>
            <h3 className={styles.sectionTitle}>Sample images</h3>
            <SampleStrip activeFilename={activeSampleFilename} onSelect={handleSelectSample} />
          </div>

          <div className={`${styles.section} glass-panel`}>
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
              <Upload size={18} strokeWidth={1.8} />
              <span>Click to upload an image</span>
            </label>
          </div>

          <div className={`${styles.section} glass-panel`}>
            <h3 className={styles.sectionTitle}>
              <Wand2 size={15} strokeWidth={1.8} aria-hidden="true" />
              See attention for a different class
            </h3>
            <p className={styles.sectionCaption}>
              The model only ever looked for these 10 things — try another to see where it would
              have looked instead.
            </p>
            <div className={`${styles.classList} thin-scroll`}>
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
    </div>
  );
}
