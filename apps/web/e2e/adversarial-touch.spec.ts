import { test, expect } from '@playwright/test';

/**
 * Regression test for the mobile-pass bug the README describes: the
 * reveal slider originally only listened for `onMouseMove`, which never
 * fires on a real touchscreen, so on an actual phone it sat frozen. The
 * fix moved to the Pointer Events API and used a ref (not state) to gate
 * the drag, to avoid a stale-closure race between pointerdown and
 * pointermove on fast/synthetic drags.
 *
 * This dispatches synthetic `pointerType: 'touch'` events directly at the
 * slider element — the same technique the README says caught the original
 * bug — rather than Playwright's mouse API, which wouldn't exercise the
 * touch-specific code path at all. Configured to run against the
 * `mobile-chromium` project (see playwright.config.ts).
 */
test('the reveal slider responds to touch pointer events, not just mouse', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-adversarial').click();

  const slider = page.getByTestId('adversarial-slider-0');
  await expect(slider).toBeVisible();
  const handle = page.getByTestId('adversarial-handle-0');

  const box = await slider.boundingBox();
  if (!box) throw new Error('Slider has no bounding box');

  const startX = box.x + box.width * 0.1;
  const endX = box.x + box.width * 0.85;
  const y = box.y + box.height / 2;

  const initialLeft = await handle.evaluate((el) => parseFloat((el as HTMLElement).style.left));
  expect(initialLeft).toBeCloseTo(50, 0); // starts at the 50% default

  // Synthetic touch drag: pointerdown at 10%, pointermove to 85%. A
  // mouse-only handler (the original bug) would never update `reveal`
  // here because no `mousemove` event fires for pointerType 'touch'.
  await slider.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: startX,
    clientY: y,
    bubbles: true,
  });
  await slider.dispatchEvent('pointermove', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: endX,
    clientY: y,
    bubbles: true,
  });

  const draggedLeft = await handle.evaluate((el) => parseFloat((el as HTMLElement).style.left));
  expect(draggedLeft).toBeGreaterThan(75); // moved substantially toward 85%

  await slider.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: endX,
    clientY: y,
    bubbles: true,
  });

  // A pointermove dispatched after pointerup (drag released) must not
  // move the handle further — this is exactly the stale-closure class of
  // bug the ref-based drag-gate exists to prevent.
  await slider.dispatchEvent('pointermove', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: startX,
    clientY: y,
    bubbles: true,
  });
  const afterReleaseLeft = await handle.evaluate((el) =>
    parseFloat((el as HTMLElement).style.left),
  );
  expect(afterReleaseLeft).toBe(draggedLeft);
});

test('touch targets on the tab bar meet the 44px minimum', async ({ page }) => {
  await page.goto('/');
  const tab = page.getByTestId('tab-adversarial');
  const box = await tab.boundingBox();
  if (!box) throw new Error('Tab has no bounding box');
  // WCAG / Apple HIG / Material minimum tap target, called out explicitly
  // in the README's mobile pass.
  expect(box.height).toBeGreaterThanOrEqual(44);
});
