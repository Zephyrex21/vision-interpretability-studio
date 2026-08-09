import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { WorkbenchContext } from './workbench-context';
import type { VisualizationTab, WorkbenchState } from './workbench-context';

export type { VisualizationTab, WorkbenchState } from './workbench-context';

const VALID_TABS: VisualizationTab[] = [
  'gradcam',
  'layers',
  'features',
  'adversarial',
  'compare',
  'occlusion',
];

/**
 * Shared workbench state — the single source of truth every visualization
 * tab (Grad-CAM, Layer Browser, Feature Gallery, Adversarial, Compare)
 * subscribes to. This is intentionally minimal in Phase 0; Phase 2 wires
 * it up to real ONNX inference results.
 */
export function WorkbenchProvider({
  children,
  initialTab,
}: {
  children: ReactNode;
  /** Lets callers (e.g. the homepage's `/app?tab=layers` deep links) open
   *  straight into a specific tab instead of always defaulting to
   *  Grad-CAM. Falls back to 'gradcam' for anything not a real tab id. */
  initialTab?: string | null;
}) {
  const startingTab = VALID_TABS.includes(initialTab as VisualizationTab)
    ? (initialTab as VisualizationTab)
    : 'gradcam';
  const [activeTab, setActiveTab] = useState<VisualizationTab>(startingTab);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [predictedClass, setPredictedClass] = useState<string | null>(null);

  const value = useMemo<WorkbenchState>(
    () => ({
      activeTab,
      setActiveTab,
      selectedImage,
      setSelectedImage,
      selectedLayer,
      setSelectedLayer,
      predictedClass,
      setPredictedClass,
    }),
    [activeTab, selectedImage, selectedLayer, predictedClass],
  );

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}
