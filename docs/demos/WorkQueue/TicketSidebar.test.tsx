import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { agents, createTickets } from './data';
import { TicketSidebar } from './TicketSidebar';
import type { Ticket } from './types';

// A Monday
const now = new Date(2026, 10, 16, 10, 0);
const ticketById = (id: string) => createTickets(now).find((ticket) => ticket.id === id)!;

function renderSidebar(ticket: Ticket) {
  const dispatch = jest.fn();
  const onJumpTo = jest.fn();
  render(
    <TicketSidebar
      ticket={ticket}
      agents={agents}
      now={now}
      dispatch={dispatch}
      onJumpTo={onJumpTo}
    />
  );
  return { dispatch, onJumpTo };
}

const pick = async (label: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await userEvent.click(screen.getByRole('option', { name: option }));
};

describe('TicketSidebar', () => {
  it('assigns, changes status and priority of this ticket', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1042'));
    await pick('Assignee', 'Maya Lindqvist');
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'assign', ids: ['T-1042'], assignee: agents[1] })
    );
    await pick('Status', 'Pending');
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'setStatus', ids: ['T-1042'], status: 'pending' })
    );
    await pick('Priority', 'Low');
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'setPriority', ids: ['T-1042'], priority: 'low' })
    );
  });

  it('unassigns with the clear button; shows no tags when there are none', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1041'));
    expect(screen.queryByText(/^#/)).toBeNull();
    // Mantine renders the clear button aria-hidden, so find it by its label
    await userEvent.click(document.querySelector('[aria-label="Unassign"]')!);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'assign', assignee: null })
    );
  });

  it('snoozes with a quick choice, and closes the menu', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1042'));
    expect(screen.getByText('#billing')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Snooze…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tomorrow, 9:00' }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snooze',
        ids: ['T-1042'],
        until: new Date(2026, 10, 17, 9, 0),
      })
    );
    expect(screen.queryByRole('button', { name: 'Tomorrow, 9:00' })).toBeNull();
  });

  it('snoozes until a date and time, only in the future', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1042'));
    await userEvent.click(screen.getByRole('button', { name: 'Snooze…' }));
    const until = screen.getByLabelText('Until');
    const submit = screen.getByRole('button', { name: 'Snooze until then' });
    expect(submit).toBeDisabled();

    await userEvent.type(until, '2026-11-15T09:00');
    expect(submit).toBeDisabled();

    await userEvent.clear(until);
    await userEvent.type(until, '2026-11-20T14:30');
    await userEvent.click(submit);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'snooze', until: new Date(2026, 10, 20, 14, 30) })
    );
  });

  it('shows when a ticket is snoozed and unsnoozes it', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1034'));
    expect(screen.getByText(/^Snoozed until/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unsnooze' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'snooze', until: null }));
  });

  it('lists the events and jumps to one', async () => {
    const { onJumpTo } = renderSidebar(ticketById('T-1041'));
    await userEvent.click(
      screen.getByRole('button', { name: /^Maya Lindqvist assigned this to Theo Okafor/ })
    );
    expect(onJumpTo).toHaveBeenCalledWith('T-1041-2');
  });
});
