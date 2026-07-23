import { ThemeProvider } from './state/ThemeContext';
import { WorkbenchProvider } from './state/WorkbenchContext';
import { WorkbenchShell } from './components/workbench/WorkbenchShell';

function App() {
  return (
    <ThemeProvider>
      <WorkbenchProvider>
        <WorkbenchShell />
      </WorkbenchProvider>
    </ThemeProvider>
  );
}

export default App;
