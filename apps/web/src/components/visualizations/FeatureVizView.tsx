import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import featureVizMetadata from '../../data/featureVizMetadata.json';
import styles from './FeatureVizView.module.css';

interface FeatureVizEntry {
  layer: string;
  filter_index: number;
  file: string;
}

const ENTRIES = featureVizMetadata as FeatureVizEntry[];

const LAYER_DESCRIPTIONS: Record<string, string> = {
  layer1: 'Earliest layer — filters respond to raw edges, colors, and simple gradients.',
  layer2: 'Filters begin combining edges into small textures and repeating patterns.',
  layer3: 'Mid-depth filters detect more complex textures and partial shapes.',
  layer4: 'Deepest layer — filters respond to object-level parts and high-level concepts.',
};

function featureVizUrl(file: string): string {
  return `/models/feature_viz/${file}`;
}

export function FeatureVizView() {
  const [selected, setSelected] = useState<FeatureVizEntry | null>(null);
  const layers = Array.from(new Set(ENTRIES.map((e) => e.layer)));

  return (
    <div className={styles.container}>
      <p className={styles.intro}>
        Each image below wasn't taken from a photo — it started as random noise and was shaped by
        gradient ascent to maximize one filter's response, revealing what that filter has learned to
        detect, independent of any particular input.
      </p>

      {layers.map((layer) => (
        <div key={layer} className={styles.layerGroup}>
          <div className={styles.layerHeader}>
            <h3 className={styles.layerTitle}>{layer}</h3>
            <p className={styles.layerCaption}>{LAYER_DESCRIPTIONS[layer]}</p>
          </div>
          <div className={styles.grid}>
            {ENTRIES.filter((e) => e.layer === layer).map((entry) => (
              <button
                key={entry.file}
                type="button"
                className={styles.thumb}
                onClick={() => setSelected(entry)}
                aria-label={`View ${entry.layer} filter ${entry.filter_index} in detail`}
              >
                <img
                  src={featureVizUrl(entry.file)}
                  alt={`${entry.layer} filter ${entry.filter_index}`}
                  loading="lazy"
                />
                <span className={styles.thumbLabel}>filter {entry.filter_index}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <AnimatePresence>
        {selected && (
          <motion.div
            className={styles.lightboxBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className={styles.lightboxCard}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={featureVizUrl(selected.file)} alt="" className={styles.lightboxImage} />
              <div className={styles.lightboxMeta}>
                <span>
                  {selected.layer} · filter {selected.filter_index}
                </span>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                  ×
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
