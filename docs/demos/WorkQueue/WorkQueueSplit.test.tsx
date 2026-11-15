import { render, screen } from '@mantine-tests/core';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkQueueSplit } from './WorkQueueSplit';

const now = new Date(2026, 10, 16, 10, 0);
const list = () => screen.getByRole('list', { name: 'Tickets' });
const rows = () =>
  within(list())
    .getAllByRole('button')
    .map((row) => row.getAttribute('aria-label'));
const conversation = () => screen.getByRole('region', { name: 'Conversation' });
// By its label, which a hidden element has no accessible name for
const details = () => document.querySelector<HTMLElement>('aside[aria-label="Ticket details"]')!;

const { ResizeObserver: originalObserver } = window;

function measureAs(width: number) {
  window.ResizeObserver = class {
    constructor(private callback: ResizeObserverCallback) {}

    observe() {
      this.callback(
        [
          {
            borderBoxSize: [{ inlineSize: width, blockSize: 640 }],
            contentRect: { x: 0, y: 0, top: 0, left: 0, bottom: 640, right: width },
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      );
    }

    unobserve() {}

    disconnect() {}
  };
}

describe('WorkQueueSplit', () => {
  afterEach(() => {
    window.ResizeObserver = originalObserver;
  });

  it('lists the inbox as rows and opens the first ticket beside it, with its details', () => {
    render(<WorkQueueSplit now={now} />);
    expect(screen.getByRole('region', { name: 'Queue' })).toBeInTheDocument();
    expect(rows().slice(0, 3)).toEqual([
      'Android app crashes on launch, Kwame Mensah',
      'Charged twice for the March invoice, Nora Feld, unread',
      'Webhook deliveries failing with 410, Fatima Zahra, unread',
    ]);
    expect(within(list()).getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true');
    expect(within(conversation()).getByText('T-1033 · Kwame Mensah')).toBeInTheDocument();
    expect(within(conversation()).queryByRole('button', { name: '← Queue' })).toBeNull();
    expect(within(details()).getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });

  it('opens a ticket from the list and reads it', async () => {
    render(<WorkQueueSplit now={now} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Charged twice for the March invoice, Nora Feld, unread' })
    );
    const nora = screen.getByRole('button', {
      name: 'Charged twice for the March invoice, Nora Feld',
    });
    expect(nora).toHaveAttribute('aria-current', 'true');
    expect(within(conversation()).getByText('T-1042 · Nora Feld')).toBeInTheDocument();

    await userEvent.type(
      within(conversation()).getByPlaceholderText('Reply to the customer'),
      'Refund is on its way{Enter}'
    );
    expect(within(conversation()).getByText('Refund is on its way')).toBeInTheDocument();
  });

  it('keeps a closed ticket open until another is picked', async () => {
    render(<WorkQueueSplit now={now} defaultTicketId="T-1042" />);
    await userEvent.click(within(details()).getByRole('combobox', { name: 'Status' }));
    await userEvent.click(screen.getByRole('option', { name: 'Closed' }));
    expect(rows()).not.toContain('Charged twice for the March invoice, Nora Feld');
    expect(screen.getByText('Inbox 9')).toBeInTheDocument();
    expect(within(conversation()).getByText('T-1042 · Nora Feld')).toBeInTheDocument();

    await userEvent.click(within(list()).getAllByRole('button')[0]);
    expect(within(conversation()).getByText('T-1033 · Kwame Mensah')).toBeInTheDocument();
  });

  it('searches the list from the toolbar', async () => {
    const user = userEvent.setup({ delay: null });
    render(<WorkQueueSplit now={now} />);
    await user.type(screen.getByRole('textbox', { name: 'Search tickets' }), 'nothing like it');
    expect(screen.getByText('No tickets match')).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Search tickets' }));
    expect(rows()).toHaveLength(10);
  });

  it('filters the list from the toolbar', async () => {
    render(<WorkQueueSplit now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const popover = screen.getByRole('dialog');
    expect(within(popover).getByRole('button', { name: 'Clear filters' })).toBeDisabled();
    await userEvent.click(within(popover).getByRole('combobox', { name: 'Priority' }));
    await userEvent.click(within(popover).getByRole('option', { name: 'Urgent' }));
    await userEvent.click(within(popover).getByRole('combobox', { name: 'Assignee' }));
    await userEvent.click(within(popover).getByRole('option', { name: 'Unassigned' }));
    expect(screen.getByRole('button', { name: 'Filters 2' })).toBeInTheDocument();
    expect(rows()).toEqual(['Charged twice for the March invoice, Nora Feld, unread']);
    await userEvent.click(within(popover).getByRole('button', { name: 'Clear filters' }));
    expect(rows()).toHaveLength(10);
  });

  it('sorts the list and switches views from the toolbar', async () => {
    render(<WorkQueueSplit now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sort by SLA, ascending' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Age' }));
    expect(rows()[0]).toBe('Webhook deliveries failing with 410, Fatima Zahra, unread');
    await userEvent.click(screen.getByRole('button', { name: 'Sort by Age, ascending' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Age ▲' }));
    expect(screen.getByRole('button', { name: 'Sort by Age, descending' })).toHaveTextContent(
      'Age ▼'
    );

    await userEvent.click(screen.getByText('Snoozed 1'));
    expect(rows()).toEqual(['Change of invoice address, Elena Rossi']);
  });

  it('assigns, tags and closes the selected tickets from the compact bulk bar', async () => {
    render(<WorkQueueSplit now={now} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1038' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(list()).toHaveAttribute('data-selecting');

    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Priya Raman' }));
    expect(screen.queryByText('2 selected')).toBeNull();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tag' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '#vip' }));

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByText('Closed 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1041' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('collapses the details behind a toggle when narrow; jumping to an event closes them', async () => {
    measureAs(800);
    render(<WorkQueueSplit now={now} defaultTicketId="T-1042" h={500} />);
    const toggle = await within(conversation()).findByRole('button', { name: 'Details' });
    expect(details()).not.toBeVisible();

    await userEvent.click(toggle);
    expect(details()).toBeVisible();
    await userEvent.click(
      within(details()).getByRole('button', { name: /^Ticket created from email/ })
    );
    expect(details()).not.toBeVisible();
    expect(screen.getByText(/^Ticket created from email ·/).parentElement).toHaveAttribute(
      'data-highlighted'
    );
  });

  it('says so when no ticket is open, with the clock of the first render by default', () => {
    render(<WorkQueueSplit defaultTicketId="T-0000" />);
    expect(screen.getByText('No ticket open')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Ticket details' })).toBeNull();
  });
});
