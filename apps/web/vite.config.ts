import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Without this, Rollup's automatic chunk-splitting groups shared
        // vendor code with whichever small first-party module happens to
        // sit at that chunk boundary and names the file after it — e.g. a
        // ~125KB chunk of framer-motion's runtime ended up named
        // "ThemeToggle-*.js" and a ~175KB chunk containing onnxruntime-web's
        // JS wrapper ended up named "HeatmapLegend-*.js". Functionally
        // harmless (loading behavior is unchanged either way), but
        // confusing for anyone reading a build/bundle-analysis report.
        manualChunks(id) {
          // First-party: the ONNX session/preprocess/inference modules are
          // shared by exactly the same three lazy tabs (Grad-CAM, Layers,
          // Compare), so Rollup correctly extracts them into one shared
          // chunk — it was just naming that chunk after HeatmapLegend, a
          // small unrelated UI component that happens to share the same
          // boundary, rather than after the ~70KB of actual logic in it.
          if (id.includes('/src/lib/onnx/')) return 'onnx-core';

          if (!id.includes('node_modules')) return undefined;
          if (id.includes('framer-motion')) return 'vendor-framer-motion';
          if (id.includes('onnxruntime-web')) return 'vendor-onnxruntime';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          // Deliberately no catch-all here — anything else (notably
          // @tensorflow/tfjs, ~1MB) must stay under Rollup's own automatic
          // splitting so it keeps loading only behind its real dynamic
          // import boundary (lib/tfjs/model.ts), not eagerly on every page.
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ holds Playwright specs (a different `test()`/`expect()` global,
    // run via `npm run test:e2e`) — Vitest must never try to collect them.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
