import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, X } from 'lucide-react';
import featureVizMetadata from '../../data/featureVizMetadata.json';
import { InfoTip } from '../ui/InfoTip';
import { SectionHeader } from '../ui/SectionHeader';
import styles from './FeatureVizView.module.css';

interface FeatureVizEntry {
  layer: string;
  filter_index: number;
  file: string;
}

const ENTRIES = featureVizMetadata as FeatureVizEntry[];

const LAYER_DESCRIPTIONS: Record<string, string> = {
  layer1:
    'Earliest layer — filters respond to raw edges, colors, and simple gradients. Expect these to look the most abstract.',
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
      <SectionHeader
        icon={LayoutGrid}
        eyebrow="Filter gallery"
        title="What each filter learned to see"
        description={
          <>
            These images will look like abstract, almost psychedelic patterns rather than
            recognizable objects — that's expected, not a rendering glitch. Each one wasn't taken
            from a photo; it started as random noise and was shaped by{' '}
            <InfoTip definition="Repeatedly nudging a random image, pixel by pixel, to make one specific filter respond as strongly as possible — the same core technique behind Grad-CAM, run backwards.">
              gradient ascent
            </InfoTip>{' '}
            until it maximized one specific filter's response. It only starts looking object-like in
            the deepest layer, below.
          </>
        }
      />

      <div className={styles.groups}>
        {layers.map((layer) => (
          <div key={layer} className={`${styles.layerGroup} glass-panel`}>
            <div className={styles.layerHeader}>
              <span className={styles.layerBadge}>{layer}</span>
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
      </div>

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
              className={`${styles.lightboxCard} glass-panel-strong`}
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
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
