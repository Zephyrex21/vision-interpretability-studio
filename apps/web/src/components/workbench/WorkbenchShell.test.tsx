import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../state/ThemeContext';
import { WorkbenchProvider } from '../../state/WorkbenchContext';
import { WorkbenchShell } from './WorkbenchShell';

function renderShell() {
  return render(
    <ThemeProvider>
      <WorkbenchProvider>
        <WorkbenchShell />
      </WorkbenchProvider>
    </ThemeProvider>,
  );
}

describe('WorkbenchShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the studio title', () => {
    renderShell();
    expect(screen.getByText(/see inside the model/i)).toBeInTheDocument();
  });

  it('renders all six visualization tabs', () => {
    renderShell();
    for (const label of ['Grad-CAM', 'Layers', 'Features', 'Adversarial', 'Compare', 'Occlusion']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('does not show any "soon" badges — all six tabs are live', () => {
    renderShell();
    expect(screen.queryByText(/soon/i)).not.toBeInTheDocument();
  });

  it('switches the active tab caption when a different tab is clicked', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Features/ }));
    expect(await screen.findByText(/what each filter detects/i)).toBeInTheDocument();
  });

  it('shows the layer-scrubber intro on the Layers tab', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Layers/ }));
    expect(await screen.findByText(/scrub through network depth/i)).toBeInTheDocument();
  });

  it('shows the adversarial comparison gallery on the adversarial tab', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Adversarial/ }));
    expect(await screen.findByText(/fast gradient sign method/i)).toBeInTheDocument();
  });

  it('shows the live-vs-precomputed explanation on the compare tab', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Compare/ }));
    expect(
      await screen.findByText(/computed fresh, right now, in your browser/i),
    ).toBeInTheDocument();
  });

  it('shows the black-box explanation on the occlusion tab', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Occlusion/ }));
    expect(await screen.findByText(/slide a blind spot across the image/i)).toBeInTheDocument();
  });

  it('reopens the onboarding tour from the header help button even after it was dismissed', async () => {
    window.localStorage.setItem('vis-studio-onboarding-seen', 'true'); // simulate a returning visitor
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /what is this tool/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
