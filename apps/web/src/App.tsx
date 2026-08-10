import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './state/ThemeContext';
import { BackgroundAtmosphere } from './components/ui/BackgroundAtmosphere';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import styles from './App.module.css';

// Lazy-loaded per route so a homepage visitor never downloads the Studio's
// code (or vice versa) — same code-splitting philosophy already used for
// the individual visualization tabs.
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

function RouteLoading() {
  return <div className={styles.routeLoading} aria-hidden="true" />;
}

function App() {
  return (
    <ThemeProvider>
      <BackgroundAtmosphere />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/app" element={<StudioPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
