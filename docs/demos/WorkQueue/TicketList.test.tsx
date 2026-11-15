import { render, screen } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { createTickets, users } from './data';
import { TicketList } from './TicketList';

const now = new Date(2026, 10, 16, 10, 0);
const tickets = createTickets(now).slice(0, 3);
const row = (name: string) => screen.getByRole('button', { name });

function Harness({ onOpen = () => {} }: { onOpen?: (id: string) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
    <TicketList
      tickets={tickets}
      users={users}
      now={now}
      openId="T-1041"
      onOpen={onOpen}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
    />
  );
}

describe('TicketList', () => {
  it('shows customer, time, subject, preview, priority, SLA and assignee', () => {
    render(<Harness />);
    const nora = row('Charged twice for the March invoice, Nora Feld, unread');
    expect(nora).toHaveTextContent('Nora Feld');
    expect(nora).toHaveTextContent('12m');
    expect(nora).toHaveAccessibleDescription(
      'Hi, following up on my email about the double charge. Any news? Urgent Overdue 20m Unassigned'
    );
    expect(row('CSV export drops accented characters, Aiko Tanaka')).toHaveTextContent(
      'Priya Raman'
    );
  });

  it('marks unread tickets with a dot and the open ticket as current', () => {
    render(<Harness />);
    expect(document.querySelectorAll('.dot')).toHaveLength(2);
    expect(row('Account locked after password reset, Luis Ortega, unread')).toHaveAttribute(
      'aria-current',
      'true'
    );
    expect(row('CSV export drops accented characters, Aiko Tanaka')).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('opens a ticket on click, and moves between rows with the arrow keys', async () => {
    const onOpen = jest.fn();
    render(<Harness onOpen={onOpen} />);
    const first = row('Charged twice for the March invoice, Nora Feld, unread');
    await userEvent.click(first);
    expect(onOpen).toHaveBeenCalledWith('T-1042');

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(row('Account locked after password reset, Luis Ortega, unread')).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    fireEvent.keyDown(first, { key: 'a' });
    expect(first).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('selects and unselects rows, showing every checkbox while any is selected', async () => {
    render(<Harness />);
    const list = screen.getByRole('list', { name: 'Tickets' });
    expect(list).not.toHaveAttribute('data-selecting');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1040' }));
    expect(list).toHaveAttribute('data-selecting');
    expect(screen.getByRole('checkbox', { name: 'Select T-1042' }).closest('li')).toHaveAttribute(
      'data-checked'
    );

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1040' }));
    expect(list).not.toHaveAttribute('data-selecting');
  });

  it('shows an empty state when nothing matches', () => {
    render(
      <TicketList
        tickets={[]}
        users={users}
        now={now}
        onOpen={() => {}}
        selectedIds={[]}
        onSelectedIdsChange={() => {}}
      />
    );
    expect(screen.getByText('No tickets match')).toBeInTheDocument();
  });
});
