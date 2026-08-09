import { createContext } from 'react';

export type VisualizationTab =
  'gradcam' | 'layers' | 'features' | 'adversarial' | 'compare' | 'occlusion';

export interface WorkbenchState {
  activeTab: VisualizationTab;
  setActiveTab: (tab: VisualizationTab) => void;
  selectedImage: string | null;
  setSelectedImage: (src: string | null) => void;
  selectedLayer: number | null;
  setSelectedLayer: (layer: number | null) => void;
  predictedClass: string | null;
  setPredictedClass: (label: string | null) => void;
}

export const WorkbenchContext = createContext<WorkbenchState | undefined>(undefined);
