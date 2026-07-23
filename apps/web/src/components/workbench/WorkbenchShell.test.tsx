import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
  it('renders the studio title', () => {
    renderShell();
    expect(screen.getByText(/see inside the model/i)).toBeInTheDocument();
  });

  it('renders all four visualization tabs', () => {
    renderShell();
    for (const label of ['Grad-CAM', 'Features', 'Adversarial', 'Compare']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('marks the not-yet-implemented tabs as "soon"', () => {
    renderShell();
    const adversarialTab = screen.getByRole('button', { name: /Adversarial/ });
    const compareTab = screen.getByRole('button', { name: /Compare/ });
    expect(adversarialTab).toHaveTextContent(/soon/i);
    expect(compareTab).toHaveTextContent(/soon/i);
  });

  it('switches the active tab caption when a different tab is clicked', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Features/ }));
    expect(await screen.findByText(/what each filter detects/i)).toBeInTheDocument();
  });

  it('shows the Phase 2.5 explanation for the adversarial tab', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /^Adversarial/ }));
    expect(await screen.findByText(/real backpropagation/i)).toBeInTheDocument();
  });
});
