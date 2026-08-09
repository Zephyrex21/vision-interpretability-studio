import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudDownload, ScanSearch, Upload } from 'lucide-react';
import { computeOcclusionSensitivity } from '../../lib/onnx/inference';
import type { ClassificationResult } from '../../lib/onnx/inference';
import { drawModelInputCanvas, loadImageElement } from '../../lib/onnx/preprocess';
import { isSessionReady } from '../../lib/onnx/session';
import { renderGradCamOverlay } from '../../lib/gradcam/renderOverlay';
import { SAMPLE_IMAGES } from '../../data/sampleImages';
import { HeatmapLegend } from '../ui/HeatmapLegend';
import { InfoTip } from '../ui/InfoTip';
import { SectionHeader } from '../ui/SectionHeader';
import { SampleStrip } from '../ui/SampleStrip';
import styles from './OcclusionView.module.css';

type Status = 'idle' | 'loading-model' | 'running' | 'ready' | 'error';

export function OcclusionView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 64 });
  const [activeSampleFilename, setActiveSampleFilename] = useState<string | null>(null);

  const runOcclusion = useCallback(async (imageUrl: string) => {
    setStatus(isSessionReady() ? 'running' : 'loading-model');
    setErrorMessage(null);
    setProgress({ done: 0, total: 64 });
    try {
      const img = await loadImageElement(imageUrl);
      const result = await computeOcclusionSensitivity(img, (done, total) => {
        setStatus('running');
        setProgress({ done, total });
      });
      setClassification(result.classification);

      const canvas = canvasRef.current;
      if (canvas) {
        // The model's own center-cropped view — occlusion patches were
        // placed in this exact pixel space, so the heatmap must be drawn
        // over it, not the original (possibly differently-cropped) photo.
        const modelView = drawModelInputCanvas(img);
        renderGradCamOverlay(canvas, modelView, {
          cam: result.sensitivity,
          height: result.gridSize,
          width: result.gridSize,
        });
      }
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Occlusion sweep failed');
      setStatus('error');
    }
  }, []);

  const handleSelectSample = useCallback(
    (filename: string) => {
      setActiveSampleFilename(filename);
      void runOcclusion(`/samples/${filename}`);
    },
    [runOcclusion],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setActiveSampleFilename(null);
      void runOcclusion(url);
    },
    [runOcclusion],
  );

  useEffect(() => {
    if (activeSampleFilename === null && status === 'idle') {
      handleSelectSample(SAMPLE_IMAGES[0].filename);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy = status === 'loading-model' || status === 'running';

  return (
    <div className={styles.container}>
      <SectionHeader
        icon={ScanSearch}
        eyebrow="Occlusion sensitivity · black-box, no gradients"
        title="Slide a blind spot across the image"
        description={
          <>
            A completely different, older technique (Zeiler &amp; Fergus, 2014): cover one small
            region at a time with a gray patch and rerun inference, measuring how much each
            occlusion hurts the model's confidence in its own original answer. Needs no access to
            weights, activations, or gradients at all — the model could be a total black box and
            this would still work. The tradeoff:{' '}
            <InfoTip definition="One forward pass per grid cell — 64 for the default 8x8 grid — instead of Grad-CAM's single pass, since there's no shortcut available without peeking inside the model.">
              64 forward passes
            </InfoTip>{' '}
            instead of one.
          </>
        }
      />

      <div className={styles.layout}>
        <div className={styles.canvasArea}>
          <div className={styles.canvasWrapper}>
            <canvas ref={canvasRef} className={styles.canvas} data-testid="occlusion-canvas" />
            <AnimatePresence>
              {isBusy && (
                <motion.div
                  className={styles.loadingOverlay}
                  data-testid="occlusion-loading-overlay"
                  data-loading-kind={status === 'loading-model' ? 'download' : 'inference'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {status === 'loading-model' ? (
                    <>
                      <CloudDownload size={22} className={styles.loadingIcon} />
                      <span>Downloading the neural network (43MB, one-time)…</span>
                    </>
                  ) : (
                    <>
                      <div className={styles.progressTrack}>
                        <motion.div
                          className={styles.progressFill}
                          animate={{
                            width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`,
                          }}
                          transition={{ duration: 0.15 }}
                        />
                      </div>
                      <span>
                        Sliding the blind spot across the image… {progress.done}/{progress.total}
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {classification && status === 'ready' && (
            <motion.div
              className={`${styles.resultCard} glass-panel-strong`}
              data-testid="occlusion-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              key={classification.predictedLabel}
            >
              <div className={styles.resultHeader}>
                <span className={styles.resultLabel}>Original prediction</span>
                <span className={styles.resultConfidenceChip}>
                  {(classification.confidence * 100).toFixed(1)}% confident
                </span>
              </div>
              <p className={styles.resultValue}>{classification.predictedLabel}</p>
              <p className={styles.caption}>
                Brighter regions are patches whose removal hurt this specific prediction the most —
                computed the same way Grad-CAM is checked, from real measured confidence drops, not
                an approximation.
              </p>
              <HeatmapLegend
                label="removing this hurt confidence: little → a lot"
                className={styles.legendSpacing}
              />
            </motion.div>
          )}

          {status === 'error' && (
            <div className={styles.errorCard}>
              Something went wrong running the occlusion sweep: {errorMessage}
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
            <p className={styles.sectionCaption}>
              Heads up — this needs many separate passes through the model, so it takes noticeably
              longer than the Grad-CAM tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
