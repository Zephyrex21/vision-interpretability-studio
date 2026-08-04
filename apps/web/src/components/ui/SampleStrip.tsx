import { SAMPLE_IMAGES, sampleImageUrl } from '../../data/sampleImages';
import styles from './SampleStrip.module.css';

interface SampleStripProps {
  activeFilename: string | null;
  onSelect: (filename: string) => void;
}

/**
 * Was two near-identical, cramped 5-column grids duplicated between
 * GradCamView and LayersView. Pulled into one shared, wider filmstrip:
 * bigger thumbnails, a visible label under each, horizontal scroll on
 * narrow viewports instead of shrinking to illegibility.
 */
export function SampleStrip({ activeFilename, onSelect }: SampleStripProps) {
  return (
    <div className={`${styles.strip} thin-scroll`}>
      {SAMPLE_IMAGES.map((sample) => {
        const isActive = activeFilename === sample.filename;
        return (
          <button
            key={sample.filename}
            type="button"
            className={`${styles.thumb} ${isActive ? styles.thumbActive : ''}`}
            onClick={() => onSelect(sample.filename)}
            aria-label={`Use sample image: ${sample.label}`}
            aria-pressed={isActive}
          >
            <img
              src={sampleImageUrl(sample.filename)}
              alt=""
              loading="lazy"
              className={styles.thumbImage}
            />
            <span className={styles.thumbLabel}>{sample.label}</span>
          </button>
        );
      })}
    </div>
  );
}
