import { test, expect } from './fixtures';

/**
 * Full page load -> model download -> live inference -> heatmap render,
 * against the real ONNX model and real WASM runtime (no mocks). This is
 * the exact flow the README's phase history says was checked manually
 * "in a real headless browser via Playwright... before shipping each
 * phase" — this spec makes that a committed, repeatable check instead of
 * a claim that only ever lived in a chat transcript.
 */
test('loads, downloads the model, runs live inference, and renders a heatmap with zero console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/app');

  // The Grad-CAM tab is the default and auto-runs inference on the first
  // sample image on mount — no click needed to kick off the flow.
  await expect(page.getByTestId('tab-gradcam')).toHaveAttribute('aria-pressed', 'true');

  // First-ever load must show the one-time-download message, not the
  // generic "running" message — this is the isSessionReady() distinction
  // the README calls out explicitly.
  const loadingOverlay = page.getByTestId('model-loading-overlay');
  await expect(loadingOverlay).toBeVisible({ timeout: 10_000 });
  await expect(loadingOverlay).toHaveAttribute('data-loading-kind', 'download');

  // The ~43MB model + ~13MB WASM runtime download, then inference runs.
  // Generous timeout: this is a real network fetch, not a mock.
  await expect(page.getByTestId('gradcam-result')).toBeVisible({ timeout: 90_000 });

  // The canvas should have real pixel content, not be blank — a blank
  // canvas would mean the heatmap silently failed to draw while the rest
  // of the UI still reported "ready".
  const canvas = page.getByTestId('gradcam-canvas');
  await expect(canvas).toBeVisible();
  const hasContent = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx || c.width === 0 || c.height === 0) return false;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    // A canvas that was never drawn to reads as all-zero (transparent black).
    return data.some((channel) => channel !== 0);
  });
  expect(hasContent).toBe(true);

  // A real prediction with a confidence percentage should be visible.
  await expect(page.getByTestId('gradcam-result')).toContainText('%');

  expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('switching samples re-runs inference without re-downloading the model', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByTestId('gradcam-result')).toBeVisible({ timeout: 90_000 });

  // Model is now cached in this page's session. Selecting a different
  // sample should go straight to "running", never back to "downloading".
  await page.getByRole('button', { name: /Use sample image: parachute/i }).click();

  const overlay = page.getByTestId('model-loading-overlay');
  // It's fine if the overlay never appears at all (inference can be fast
  // enough to skip a visible loading frame) — what must never happen is
  // the download variant reappearing.
  if (await overlay.isVisible().catch(() => false)) {
    await expect(overlay).toHaveAttribute('data-loading-kind', 'inference');
  }

  await expect(page.getByTestId('gradcam-result')).toContainText('parachute', {
    ignoreCase: true,
    timeout: 15_000,
  });
});
