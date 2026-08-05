import { test as base, expect } from '@playwright/test';

const ONBOARDING_STORAGE_KEY = 'vis-studio-onboarding-seen';

/**
 * A fresh Playwright browser context has empty localStorage, so
 * `useOnboardingTour` correctly auto-opens the tour on every single
 * `page.goto('/')` — exactly as it should for a real first-time visitor.
 * Its modal backdrop then intercepts every subsequent click, which isn't
 * a bug in the app, it's these specs failing to set up state the way a
 * *returning* visitor would have it. `addInitScript` runs before any of
 * the page's own scripts, so `hasSeenOnboarding()` already sees `true` by
 * the time React mounts, and the tour never opens in the first place.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, ONBOARDING_STORAGE_KEY);
    await use(page);
  },
});

export { expect };
