import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingTour } from './OnboardingTour';

function renderTour(open: boolean) {
  const onDismiss = vi.fn();
  const utils = render(<OnboardingTour open={open} onDismiss={onDismiss} />);
  return { onDismiss, ...utils };
}

describe('OnboardingTour', () => {
  it('renders when open is true', async () => {
    renderTour(true);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/see inside a real vision model/i)).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderTour(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists all six tabs with a short description each', async () => {
    renderTour(true);
    await screen.findByRole('dialog');
    for (const label of ['Grad-CAM', 'Layers', 'Features', 'Adversarial', 'Compare', 'Occlusion']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('calls onDismiss when the "Start exploring" button is clicked', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderTour(true);
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /start exploring/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderTour(true);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderTour(true);
    const dialog = await screen.findByRole('dialog');

    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('unmounts (after its exit animation) when open flips from true to false', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<OnboardingTour open={true} onDismiss={onDismiss} />);
    const dialog = await screen.findByRole('dialog');

    rerender(<OnboardingTour open={false} onDismiss={onDismiss} />);

    await waitForElementToBeRemoved(dialog);
  });
});
