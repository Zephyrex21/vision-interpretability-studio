import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classifyWithLayerActivations } from '../../lib/onnx/inference';
import type { StageActivationMap } from '../../lib/onnx/inference';
import { loadImageElement } from '../../lib/onnx/preprocess';
import { isSessionReady } from '../../lib/onnx/session';
import { renderGradCamOverlay } from '../../lib/gradcam/renderOverlay';
import { SAMPLE_IMAGES, sampleImageUrl } from '../../data/sampleImages';
import { HeatmapLegend } from '../ui/HeatmapLegend';
import { InfoTip } from '../ui/InfoTip';
import styles from './LayersView.module.css';

const STAGE_CAPTIONS: Record<string, string> = {
  stem: 'Raw edges, colors, and simple gradients — the network has barely started.',
  layer1: 'Edges begin combining into small textures and local patterns.',
  layer2: 'Textures combine into larger patterns and partial shapes.',
  layer3: 'Shapes become object parts — the network starts to see components.',
  layer4: 'Whole-object concepts — this is what the final decision is based on.',
};

type Status = 'loading-model' | 'running' | 'ready' | 'error';

export function LayersView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [stages, setStages] = useState<StageActivationMap[]>([]);
  const [activeStage, setActiveStage] = useState(0);
  const [predictedLabel, setPredictedLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading-model');
  const [activeSample, setActiveSample] = useState(SAMPLE_IMAGES[0].filename);

  const loadAndScrub = async (filename: string) => {
    // See the comment in GradCamView.tsx — isSessionReady() distinguishes
    // the one-time ~43MB model download from a normal, fast forward pass.
    setStatus(isSessionReady() ? 'running' : 'loading-model');
    try {
      const img = await loadImageElement(sampleImageUrl(filename));
      imgRef.current = img;
      const result = await classifyWithLayerActivations(img);
      setStages(result.stages);
      setPredictedLabel(result.classification.predictedLabel);
      setActiveStage(0);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  useEffect(() => {
    void loadAndScrub(activeSample);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const stage = stages[activeStage];
    if (!canvas || !img || !stage) return;
    renderGradCamOverlay(
      canvas,
      img,
      { cam: stage.energy, height: stage.height, width: stage.width },
      { size: 320, alpha: 0.55 },
    );
  }, [stages, activeStage]);

  const stage = stages[activeStage];

  return (
    <div className={styles.container}>
      <p className={styles.intro}>
        Scrub through network depth to watch where activity concentrates as an image moves through
        the network — not a class explanation like Grad-CAM, just "where is this layer paying
        attention." No gradients involved, just the raw{' '}
        <InfoTip definition="A neuron's output value after seeing the image — how strongly that specific detector fired, at every location in the image.">
          activation
        </InfoTip>{' '}
        magnitudes at each depth.
      </p>

      <div className={styles.layout}>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRef} className={styles.canvas} data-testid="layers-canvas" />
          <AnimatePresence>
            {(status === 'loading-model' || status === 'running') && (
              <motion.div
                className={styles.loadingOverlay}
                data-testid="model-loading-overlay"
                data-loading-kind={status === 'loading-model' ? 'download' : 'inference'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {status === 'loading-model'
                  ? 'Downloading the neural network (43MB, one-time)…'
                  : 'Running the network on your image…'}
              </motion.div>
            )}
          </AnimatePresence>
          {status === 'error' && <div className={styles.errorText}>Failed to run inference.</div>}
        </div>

        <div className={styles.controls}>
          <div className={styles.sampleGrid}>
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.filename}
                type="button"
                className={styles.sampleThumb}
                aria-pressed={sample.filename === activeSample}
                onClick={() => {
                  setActiveSample(sample.filename);
                  void loadAndScrub(sample.filename);
                }}
                aria-label={`Use sample image: ${sample.label}`}
              >
                <img src={sampleImageUrl(sample.filename)} alt={sample.label} loading="lazy" />
              </button>
            ))}
          </div>

          {predictedLabel && status === 'ready' && (
            <p className={styles.prediction}>
              Predicted: <strong>{predictedLabel}</strong>
            </p>
          )}

          <div className={styles.scrubber}>
            {stages.map((s, idx) => {
              const isActive = idx === activeStage;
              return (
                <button
                  key={s.label}
                  type="button"
                  className={`${styles.stageButton} ${isActive ? styles.stageButtonActive : ''}`}
                  aria-pressed={isActive}
                  disabled={status !== 'ready'}
                  onClick={() => setActiveStage(idx)}
                >
                  <span className={styles.stageLabel}>{s.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {stage && (
              <motion.p
                key={stage.label}
                className={styles.stageCaption}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {STAGE_CAPTIONS[stage.label]}
              </motion.p>
            )}
          </AnimatePresence>

          <HeatmapLegend />
        </div>
      </div>
    </div>
  );
}
