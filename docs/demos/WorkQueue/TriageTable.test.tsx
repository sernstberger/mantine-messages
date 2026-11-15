import { render, screen } from '@mantine-tests/core';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { agents, createTickets, TAGS, users } from './data';
import { BulkActions } from './BulkActions';
import { QueueFilters } from './QueueFilters';
import { DEFAULT_FILTERS } from './queue';
import { TriageTable, TriageTableProps } from './TriageTable';

const now = new Date(2026, 10, 16, 10, 0);
const tickets = createTickets(now).filter((ticket) =>
  ['T-1042', 'T-1041', 'T-1032'].includes(ticket.id)
);

function renderTable(props: Partial<TriageTableProps> = {}) {
  const handlers = { onSelectedIdsChange: jest.fn(), onSort: jest.fn(), onOpen: jest.fn() };
  render(
    <TriageTable
      tickets={tickets}
      users={users}
      now={now}
      selectedIds={[]}
      sort={{ key: 'sla', direction: 'asc' }}
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

const row = (subject: string) => screen.getByRole('button', { name: subject }).closest('tr')!;

describe('TriageTable', () => {
  it('shows status, priority, assignee, age and SLA for each ticket', () => {
    renderTable();
    const nora = within(row('Charged twice for the March invoice'));
    expect(nora.getByText('T-1042 · Nora Feld · #billing')).toBeInTheDocument();
    expect(nora.getByText('Open')).toBeInTheDocument();
    expect(nora.getByText('Urgent')).toBeInTheDocument();
    expect(nora.getByText('Unassigned')).toBeInTheDocument();
    expect(nora.getByText('2h')).toBeInTheDocument();
    expect(nora.getByText('Overdue 20m')).toBeInTheDocument();

    const luis = within(row('Account locked after password reset'));
    expect(luis.getByText('Theo Okafor')).toBeInTheDocument();
    expect(luis.getByText('45m left')).toBeInTheDocument();
    expect(within(row('How do I add a teammate?')).getByText('Done')).toBeInTheDocument();
  });

  it('opens a ticket from its subject', async () => {
    const { onOpen } = renderTable();
    await userEvent.click(
      screen.getByRole('button', { name: 'Account locked after password reset' })
    );
    expect(onOpen).toHaveBeenCalledWith('T-1041');
  });

  it('marks the sorted column and asks to sort by another', async () => {
    const { onSort } = renderTable({ sort: { key: 'priority', direction: 'desc' } });
    expect(screen.getByRole('columnheader', { name: 'Priority' })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    expect(screen.getByRole('columnheader', { name: 'SLA' })).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(screen.getByRole('button', { name: 'SLA' }));
    expect(onSort).toHaveBeenCalledWith('sla');
  });

  it('shows the ascending arrow', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: 'SLA' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
  });

  it('selects one ticket, all of them, or none', async () => {
    const { onSelectedIdsChange } = renderTable({ selectedIds: ['T-1042'] });
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
      'data-indeterminate',
      'true'
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1041' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['T-1042', 'T-1041']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['T-1042', 'T-1041', 'T-1032']);
  });

  it('clears the selection from the header when everything is selected', async () => {
    const { onSelectedIdsChange } = renderTable({ selectedIds: ['T-1042', 'T-1041', 'T-1032'] });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);
  });

  it('says when nothing matches', () => {
    renderTable({ tickets: [] });
    expect(screen.getByText('No tickets match')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select all' })).not.toBeChecked();
  });
});

describe('QueueFilters', () => {
  it('switches views, searches and filters by priority and assignee', async () => {
    const onChange = jest.fn();
    render(
      <QueueFilters
        filters={DEFAULT_FILTERS}
        onChange={onChange}
        agents={agents}
        counts={{ inbox: 10, snoozed: 1, closed: 1, all: 12 }}
      />
    );
    await userEvent.click(screen.getByText('Snoozed 1'));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, view: 'snoozed' });

    await userEvent.type(screen.getByRole('textbox', { name: 'Search tickets' }), 'x');
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, search: 'x' });

    await userEvent.click(screen.getByPlaceholderText('Any priority'));
    await userEvent.click(screen.getByRole('option', { name: 'Urgent' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, priority: 'urgent' });

    await userEvent.click(screen.getByPlaceholderText('Anyone'));
    await userEvent.click(screen.getByRole('option', { name: 'Unassigned' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, assigneeId: 'unassigned' });
  });
});

describe('BulkActions', () => {
  it('assigns, tags, closes and clears the selection', async () => {
    const handlers = {
      onAssign: jest.fn(),
      onClose: jest.fn(),
      onTag: jest.fn(),
      onClear: jest.fn(),
    };
    render(<BulkActions count={2} agents={agents} tags={TAGS} {...handlers} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Maya Lindqvist' }));
    expect(handlers.onAssign).toHaveBeenLastCalledWith(agents[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unassigned' }));
    expect(handlers.onAssign).toHaveBeenLastCalledWith(null);

    await userEvent.click(screen.getByRole('button', { name: 'Tag' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '#vip' }));
    expect(handlers.onTag).toHaveBeenCalledWith('vip');

    await userEvent.click(screen.getByRole('button', { name: 'Close tickets' }));
    expect(handlers.onClose).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(handlers.onClear).toHaveBeenCalled();
  });
});
