import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React error boundaries must be class components — there's no hook
 * equivalent. Without one anywhere in the tree, any error thrown during
 * render (most commonly here: a lazy-loaded chunk failing to fetch, e.g.
 * a stale browser cache referencing a hashed filename from before the
 * last deploy) silently unmounts the entire app with zero visual
 * feedback — a blank white page and nothing in the console pointing a
 * visitor anywhere useful.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  handleReload = () => {
    // A hard reload (not client-side navigation) so a stale cached chunk
    // reference — the most likely real cause of an error this boundary
    // ever actually catches — gets a genuinely fresh index.html + asset
    // manifest, not just a re-render of the same broken JS already loaded.
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className={styles.wrap}>
          <div className={styles.card}>
            <p className={styles.eyebrow}>Something went wrong</p>
            <h1 className={styles.title}>This page hit an error</h1>
            <p className={styles.description}>
              Usually a stale cache after an update. Reloading fixes it most of the time.
            </p>
            <pre className={styles.errorText}>{this.state.error.message}</pre>
            <button type="button" className={styles.button} onClick={this.handleReload}>
              Reload the page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
