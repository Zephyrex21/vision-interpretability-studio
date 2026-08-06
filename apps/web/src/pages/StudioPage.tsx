import { useSearchParams } from 'react-router-dom';
import { WorkbenchProvider } from '../state/WorkbenchContext';
import { WorkbenchShell } from '../components/workbench/WorkbenchShell';

export function StudioPage() {
  const [searchParams] = useSearchParams();

  return (
    <WorkbenchProvider initialTab={searchParams.get('tab')}>
      <WorkbenchShell />
    </WorkbenchProvider>
  );
}
