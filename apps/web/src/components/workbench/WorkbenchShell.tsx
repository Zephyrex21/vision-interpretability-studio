import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useWorkbench } from '../../state/WorkbenchContext';
import type { VisualizationTab } from '../../state/WorkbenchContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import styles from './WorkbenchShell.module.css';

// Lazy-loaded per tab so a visitor who only opens, say, the Features tab
// never downloads onnxruntime-web's JS wrapper (~500KB) at all — that code
// only lives in the Grad-CAM and Compare chunks, which are the only two
// tabs that actually run model inference.
const GradCamView = lazy(() =>
  import('../visualizations/GradCamView').then((m) => ({ default: m.GradCamView })),
);
const LayersView = lazy(() =>
  import('../visualizations/LayersView').then((m) => ({ default: m.LayersView })),
);
const FeatureVizView = lazy(() =>
  import('../visualizations/FeatureVizView').then((m) => ({ default: m.FeatureVizView })),
);
const AdversarialView = lazy(() =>
  import('../visualizations/AdversarialView').then((m) => ({ default: m.AdversarialView })),
);
const CompareView = lazy(() =>
  import('../visualizations/CompareView').then((m) => ({ default: m.CompareView })),
);

const TABS: { id: VisualizationTab; label: string; caption: string; status: 'live' | 'soon' }[] = [
  { id: 'gradcam', label: 'Grad-CAM', caption: 'What drove the decision', status: 'live' },
  { id: 'layers', label: 'Layers', caption: 'How depth builds meaning', status: 'live' },
  { id: 'features', label: 'Features', caption: 'What each filter detects', status: 'live' },
  { id: 'adversarial', label: 'Adversarial', caption: 'How fragile is trust', status: 'live' },
  {
    id: 'compare',
    label: 'Compare',
    caption: 'Live Grad-CAM vs precomputed Grad-CAM++',
    status: 'live',
  },
];

export function WorkbenchShell() {
  const { activeTab, setActiveTab } = useWorkbench();
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Vision Interpretability Studio</p>
          <h1 className={styles.title}>See inside the model, not just its answer</h1>
        </div>
        <ThemeToggle />
      </header>

      <nav className={styles.tabs} aria-label="Visualization mode">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={styles.tabButton}
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.id)}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-highlight"
                  className={styles.tabHighlight}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className={styles.tabContent}>
                <span className={styles.tabLabel}>{tab.label}</span>
                {tab.status === 'soon' && <span className={styles.soonBadge}>soon</span>}
              </span>
            </button>
          );
        })}
      </nav>

      <main className={`${styles.stage} glass-panel`}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className={styles.stageCaption}>{active.caption}</p>

          <Suspense fallback={<div className={styles.tabLoading}>Loading {active.label}…</div>}>
            {active.id === 'gradcam' && <GradCamView />}
            {active.id === 'layers' && <LayersView />}
            {active.id === 'features' && <FeatureVizView />}
            {active.id === 'adversarial' && <AdversarialView />}
            {active.id === 'compare' && <CompareView />}
          </Suspense>
        </motion.div>
      </main>
    </div>
  );
}
