import { useContext } from 'react';
import { WorkbenchContext } from './workbench-context';
import type { WorkbenchState } from './workbench-context';

export function useWorkbench(): WorkbenchState {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error('useWorkbench must be used within a WorkbenchProvider');
  return ctx;
}
