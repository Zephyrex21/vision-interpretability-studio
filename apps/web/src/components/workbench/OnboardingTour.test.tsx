import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingTour } from './OnboardingTour';

const STORAGE_KEY = 'vis-studio-onboarding-seen';

describe('OnboardingTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('shows on a first visit (no localStorage flag set)', async () => {
    render(<OnboardingTour />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/see inside a real vision model/i)).toBeInTheDocument();
  });

  it('lists all five tabs with a short description each', async () => {
    render(<OnboardingTour />);
    await screen.findByRole('dialog');
    for (const label of ['Grad-CAM', 'Layers', 'Features', 'Adversarial', 'Compare']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('does not show if the localStorage flag is already set', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<OnboardingTour />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismissing sets the localStorage flag and closes the dialog', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour />);
    const dialog = await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /start exploring/i }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
    await waitForElementToBeRemoved(dialog);
  });

  it('pressing Escape dismisses the dialog and persists the flag', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour />);
    const dialog = await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
    await waitForElementToBeRemoved(dialog);
  });

  it('clicking the backdrop dismisses the dialog', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour />);
    const dialog = await screen.findByRole('dialog');

    // The backdrop is the dialog's parent element in this component's DOM structure.
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
    await waitForElementToBeRemoved(dialog);
  });
});
