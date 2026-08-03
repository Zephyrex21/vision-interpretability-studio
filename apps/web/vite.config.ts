import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ holds Playwright specs (a different `test()`/`expect()` global,
    // run via `npm run test:e2e`) — Vitest must never try to collect them.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
