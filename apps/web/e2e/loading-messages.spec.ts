import { test, expect } from '@playwright/test';

/**
 * The README's "comprehension pass" describes fixing generic "Loading
 * model…" messaging into two distinct states via `isSessionReady()`, and
 * says it was "verified with a throttled-network Playwright test that
 * specifically watches for the download message appearing on a first
 * load and not reappearing on a second tab once the model is cached."
 *
 * This doesn't throttle the network (not worth the flakiness for what
 * `isSessionReady()` already makes a deterministic property, not a timing
 * one) — it instead directly exercises the actual thing that matters:
 * the ONNX session is a module-level singleton (see `lib/onnx/session.ts`),
 * so once Grad-CAM's first inference finishes, switching to Layers in the
 * same page load must never show the "download" variant again, only the
 * fast "inference" variant (or nothing at all, if it's fast enough to
 * skip a visible frame).
 */
test('the download message appears on first load and never reappears for a cached session', async ({
  page,
}) => {
  await page.goto('/');

  // First load on the default Grad-CAM tab: must be the download variant.
  const overlay = page.getByTestId('model-loading-overlay');
  await expect(overlay).toBeVisible({ timeout: 10_000 });
  await expect(overlay).toHaveAttribute('data-loading-kind', 'download');
  await expect(page.getByTestId('gradcam-result')).toBeVisible({ timeout: 90_000 });

  // Same session, different tab, same underlying ONNX session (singleton,
  // see session.ts) — must never show "download" again.
  await page.getByTestId('tab-layers').click();
  await expect(page.getByTestId('layers-canvas')).toBeVisible();

  // The overlay may or may not be visible depending on how fast this run,
  // but if it IS visible, it must be the "inference" variant, never
  // "download" — that's the actual bug this test guards against.
  const layersOverlay = page.getByTestId('model-loading-overlay');
  const overlayAppeared = await layersOverlay
    .waitFor({ state: 'visible', timeout: 2000 })
    .then(() => true)
    .catch(() => false);

  if (overlayAppeared) {
    await expect(layersOverlay).toHaveAttribute('data-loading-kind', 'inference');
  }

  // Either way, the scrubber should reach a ready state without ever
  // having shown a download message on this tab.
  await expect(page.getByRole('button', { name: 'stem' })).toBeEnabled({ timeout: 15_000 });
});
