import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React, { useReducer } from 'react';
import { agents, createTickets, users } from './data';
import { queueReducer } from './queue';
import { TicketView } from './TicketView';
import type { Ticket } from './types';

const now = new Date(2026, 10, 16, 10, 0);
const ticketById = (id: string) => createTickets(now).find((ticket) => ticket.id === id)!;

function Harness({ initial, onBack = () => {} }: { initial: Ticket; onBack?: () => void }) {
  const [tickets, dispatch] = useReducer(queueReducer, [initial]);
  return (
    <TicketView
      ticket={tickets[0]}
      users={users}
      agents={agents}
      now={now}
      dispatch={dispatch}
      onBack={onBack}
    />
  );
}

describe('TicketView', () => {
  it('shows the subject, id, customer and status, and goes back to the queue', async () => {
    const onBack = jest.fn();
    render(<Harness initial={ticketById('T-1042')} onBack={onBack} />);
    expect(
      screen.getByText('Charged twice for the March invoice', { selector: 'p' })
    ).toBeInTheDocument();
    expect(screen.getByText('T-1042 · Nora Feld')).toBeInTheDocument();
    expect(screen.getByText('Open', { selector: '.mantine-Badge-label' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← Queue' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('sends a public reply, or an internal note in Note mode', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.type(
      screen.getByPlaceholderText('Reply to the customer'),
      'Refund is on its way{Enter}'
    );
    expect(screen.getByText('Refund is on its way').closest('[data-note]')).toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: 'Internal note' }));
    await userEvent.type(
      screen.getByPlaceholderText('Only your team sees notes'),
      'Refunded in Stripe{Enter}'
    );
    expect(screen.getByText('Refunded in Stripe').closest('[data-note]')).toBeInTheDocument();
  });

  it('opens an email card in a modal and closes it', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Open email: Charged twice for the March invoice' })
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Finance, Brightloop');
    await userEvent.click(screen.getByRole('button', { name: 'Close email' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('logs a change in the timeline and the activity list', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Priority' }));
    await userEvent.click(screen.getByRole('option', { name: 'Low' }));
    expect(
      screen.getByRole('button', { name: /^You changed the priority to Low/ })
    ).toBeInTheDocument();
    expect(screen.getByText(/^You changed the priority to Low ·/)).toBeInTheDocument();
  });

  it('jumps to an event in the timeline from the activity list, and flashes it', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.click(screen.getByRole('button', { name: /^Ticket created from email/ }));
    expect(screen.getByText(/^Ticket created from email ·/).parentElement).toHaveAttribute(
      'data-highlighted'
    );
  });
});
