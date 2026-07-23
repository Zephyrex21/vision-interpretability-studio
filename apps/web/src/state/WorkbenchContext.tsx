import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Shared workbench state — the single source of truth every visualization
 * tab (Grad-CAM, Layer Browser, Feature Gallery, Adversarial, Compare)
 * subscribes to. This is intentionally minimal in Phase 0; Phase 2 wires
 * it up to real ONNX inference results.
 */

export type VisualizationTab = 'gradcam' | 'layers' | 'features' | 'adversarial' | 'compare';

interface WorkbenchState {
  activeTab: VisualizationTab;
  setActiveTab: (tab: VisualizationTab) => void;
  selectedImage: string | null;
  setSelectedImage: (src: string | null) => void;
  selectedLayer: number | null;
  setSelectedLayer: (layer: number | null) => void;
  predictedClass: string | null;
  setPredictedClass: (label: string | null) => void;
}

const WorkbenchContext = createContext<WorkbenchState | undefined>(undefined);

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

export function useWorkbench(): WorkbenchState {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error('useWorkbench must be used within a WorkbenchProvider');
  return ctx;
}
