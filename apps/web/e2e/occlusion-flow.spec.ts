import { test, expect } from './fixtures';

/**
 * Occlusion sensitivity runs 64 sequential forward passes (an 8x8 grid,
 * no gradients) instead of Grad-CAM's single pass, so this is
 * deliberately slower than gradcam-flow.spec.ts's equivalent test.
 * Also exercises the /app?tab=X deep-linking the homepage's feature
 * cards rely on, landing directly on Occlusion instead of the default
 * Grad-CAM tab.
 */
test('loads via deep link, runs the black-box sweep, and renders a heatmap with zero console errors', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/app?tab=occlusion');

  // Deep-linking via ?tab= should land directly on Occlusion, not the
  // default Grad-CAM tab.
  await expect(page.getByTestId('tab-occlusion')).toHaveAttribute('aria-pressed', 'true');

  const loadingOverlay = page.getByTestId('occlusion-loading-overlay');
  await expect(loadingOverlay).toBeVisible({ timeout: 10_000 });

  // Real model download plus 64 real sequential forward passes — the
  // most generous timeout of any spec in this suite for exactly that
  // reason.
  await expect(page.getByTestId('occlusion-result')).toBeVisible({ timeout: 150_000 });

  const canvas = page.getByTestId('occlusion-canvas');
  await expect(canvas).toBeVisible();
  const hasContent = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx || c.width === 0 || c.height === 0) return false;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    return data.some((channel) => channel !== 0);
  });
  expect(hasContent).toBe(true);

  await expect(page.getByTestId('occlusion-result')).toContainText('%');

  expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});
