import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_IMAGE = path.join(__dirname, '../public/samples/sample_00_chain_saw.jpg');

const TFJS_WEIGHT_PATHS = ['/models/tfjs/weights.bin', '/models/tfjs/manifest.json'];

/**
 * The README claims: "a real browser test confirmed zero TF.js-related
 * network requests happen just from opening the Adversarial tab and
 * browsing the precomputed gallery, and a second test confirmed uploading
 * a real photo produces a genuine result end-to-end." This is that test,
 * committed instead of only having happened once in a chat session.
 *
 * The TF.js weight files are the reliable signal for "did the attack
 * engine load" — @tensorflow/tfjs itself is a static JS import inside a
 * dynamically-`import()`-ed chunk, so the weight fetch is the actual
 * network-visible proof the engine spun up, not just that its code
 * downloaded.
 */
test('opening the Adversarial tab and browsing the gallery never fetches the TF.js engine', async ({
  page,
}) => {
  const tfjsRequests: string[] = [];
  page.on('request', (req) => {
    if (TFJS_WEIGHT_PATHS.some((p) => req.url().includes(p))) {
      tfjsRequests.push(req.url());
    }
  });

  await page.goto('/app');
  await page.getByTestId('tab-adversarial').click();

  // Confirm the precomputed gallery actually rendered (i.e. this isn't
  // passing trivially because the tab failed to load anything).
  await expect(page.getByTestId('adversarial-slider-0')).toBeVisible();
  await expect(page.getByTestId('adversarial-slider-9')).toBeVisible();

  // Give any accidental eager fetch a moment to fire before asserting
  // its absence.
  await page.waitForTimeout(1000);

  expect(tfjsRequests).toEqual([]);
});

test('uploading a photo to the live FGSM playground does fetch the TF.js engine and produces a real result', async ({
  page,
}) => {
  test.setTimeout(120_000);

  const tfjsRequests: string[] = [];
  page.on('request', (req) => {
    if (TFJS_WEIGHT_PATHS.some((p) => req.url().includes(p))) {
      tfjsRequests.push(req.url());
    }
  });

  await page.goto('/app');
  await page.getByTestId('tab-adversarial').click();
  await expect(page.getByTestId('adversarial-slider-0')).toBeVisible();

  await page.getByTestId('fgsm-upload-input').setInputFiles(SAMPLE_IMAGE);

  await expect(page.getByTestId('fgsm-status')).toHaveAttribute('data-status', 'ready', {
    timeout: 90_000,
  });

  expect(tfjsRequests.length).toBeGreaterThan(0);
});
