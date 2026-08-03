import { useContext } from 'react';
import { WorkbenchContext } from './workbenchContext';
import type { WorkbenchState } from './workbenchContext';

export function useWorkbench(): WorkbenchState {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error('useWorkbench must be used within a WorkbenchProvider');
  return ctx;
}
