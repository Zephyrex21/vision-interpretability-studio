import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite for the flows the README's phase history describes as having
 * been manually verified in a real browser — page load through live
 * inference, the touch-drag adversarial slider, the lazy TF.js engine
 * boundary, and the download-vs-cached loading messages. These were
 * previously ad hoc, un-committed verification runs; this file makes them
 * a real, repeatable, CI-able suite instead of a claim in prose.
 *
 * The model assets are real (~43MB ONNX + ~13MB WASM, ~43MB of TF.js
 * weights for the adversarial/compare playgrounds), so these tests talk to
 * the actual files rather than mocks — that's the point, matching the
 * README's "verified against the real model" claims. Expect this suite to
 * take noticeably longer than the Vitest unit suite; it is not meant to
 * run on every keystroke.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // shares one dev-server + one browser's model cache across the file
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 120_000, // first-load model downloads are large; give them room
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The Adversarial slider fix this suite regression-tests was a
      // touch-only bug (onMouseMove never fires on touchscreens) — a
      // Chromium-only run wouldn't have caught it, so a mobile-emulated
      // project stays in the matrix specifically for that spec.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /adversarial-touch\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
