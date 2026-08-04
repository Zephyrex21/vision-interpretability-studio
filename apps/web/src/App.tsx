import { ThemeProvider } from './state/ThemeContext';
import { WorkbenchProvider } from './state/WorkbenchContext';
import { WorkbenchShell } from './components/workbench/WorkbenchShell';
import { BackgroundAtmosphere } from './components/ui/BackgroundAtmosphere';

function App() {
  return (
    <ThemeProvider>
      <WorkbenchProvider>
        <BackgroundAtmosphere />
        <WorkbenchShell />
      </WorkbenchProvider>
    </ThemeProvider>
  );
}

export default App;
