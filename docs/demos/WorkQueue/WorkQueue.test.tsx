import { render, screen } from '@mantine-tests/core';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkQueue } from './WorkQueue';

const now = new Date(2026, 10, 16, 10, 0);
const subjects = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryAllByRole('button')[0]?.textContent);

describe('WorkQueue', () => {
  it('lists the inbox by SLA, most urgent first, and re-sorts by priority', async () => {
    render(<WorkQueue now={now} />);
    expect(screen.getByText('Inbox 10')).toBeInTheDocument();
    expect(subjects().slice(0, 3)).toEqual([
      'Android app crashes on launch',
      'Charged twice for the March invoice',
      'Webhook deliveries failing with 410',
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Priority' }));
    expect(subjects().slice(0, 2)).toEqual([
      'Charged twice for the March invoice',
      'Webhook deliveries failing with 410',
    ]);
  });

  it('searches and switches to snoozed tickets', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search tickets' }), 'okta');
    expect(subjects()).toEqual(['SSO setup with Okta']);
    await userEvent.clear(screen.getByRole('textbox', { name: 'Search tickets' }));
    await userEvent.click(screen.getByText('Snoozed 1'));
    expect(subjects()).toEqual(['Change of invoice address']);
  });

  it('closes, assigns and tags the selected tickets, then clears the selection', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1039' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Priya Raman' }));
    expect(screen.queryByText('2 selected')).toBeNull();
    expect(screen.getAllByText('Priya Raman').length).toBeGreaterThanOrEqual(3);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tag' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '#vip' }));
    expect(screen.getByText('T-1042 · Nora Feld · #billing · #vip')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close tickets' }));
    expect(screen.getByText('Inbox 9')).toBeInTheDocument();
    expect(screen.getByText('Closed 2')).toBeInTheDocument();
    expect(subjects()).not.toContain('Charged twice for the March invoice');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1041' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('clears the selection when the filters change', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByText('All 12'));
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('opens a ticket, snoozes it out of the inbox, and goes back', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Charged twice for the March invoice' })
    );
    expect(screen.getByRole('log')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Snooze…' }));
    await userEvent.click(screen.getByRole('button', { name: 'In 1 hour' }));
    expect(screen.getByText(/^Snoozed until/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '← Queue' }));
    expect(screen.getByText('Inbox 9')).toBeInTheDocument();
    expect(screen.getByText('Snoozed 2')).toBeInTheDocument();
  });

  it('opens on a ticket when asked, with the clock of the first render by default', () => {
    render(<WorkQueue defaultTicketId="T-1038" h={500} />);
    expect(screen.getByText('T-1038 · Fatima Zahra')).toBeInTheDocument();
  });
});
