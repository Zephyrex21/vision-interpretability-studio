import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoTip } from './InfoTip';

function setup() {
  return render(
    <div>
      <p>
        This uses the{' '}
        <InfoTip definition="A method for nudging pixels to fool a model.">
          Fast Gradient Sign Method
        </InfoTip>
        .
      </p>
      <button type="button">Outside button</button>
    </div>,
  );
}

describe('InfoTip', () => {
  it('does not show the definition initially', () => {
    setup();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the definition when the term is clicked', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /fast gradient sign method/i }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/nudging pixels/i);
  });

  it('hides the definition when the term is clicked again', async () => {
    const user = userEvent.setup();
    setup();
    const term = screen.getByRole('button', { name: /fast gradient sign method/i });

    await user.click(term);
    await screen.findByRole('tooltip');
    await user.click(term);

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('closes when clicking outside the tooltip', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /fast gradient sign method/i }));
    await screen.findByRole('tooltip');

    await user.click(screen.getByRole('button', { name: /outside button/i }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /fast gradient sign method/i }));
    await screen.findByRole('tooltip');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('sets aria-expanded correctly for accessibility', async () => {
    const user = userEvent.setup();
    setup();
    const term = screen.getByRole('button', { name: /fast gradient sign method/i });

    expect(term).toHaveAttribute('aria-expanded', 'false');
    await user.click(term);
    expect(term).toHaveAttribute('aria-expanded', 'true');
  });
});
