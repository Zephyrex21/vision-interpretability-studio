import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { WorkbenchContext } from './workbenchContext';
import type { VisualizationTab, WorkbenchState } from './workbenchContext';

export type { VisualizationTab, WorkbenchState } from './workbenchContext';

/**
 * Shared workbench state — the single source of truth every visualization
 * tab (Grad-CAM, Layer Browser, Feature Gallery, Adversarial, Compare)
 * subscribes to. This is intentionally minimal in Phase 0; Phase 2 wires
 * it up to real ONNX inference results.
 */
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<VisualizationTab>('gradcam');
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
