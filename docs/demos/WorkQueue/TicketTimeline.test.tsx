import { DirectionProvider } from '@mantine/core';
import { render, screen } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MessageListControl } from 'mantine-messages';
import React, { useState } from 'react';
import { createTickets, users } from './data';
import { EmailModal } from './EmailModal';
import { TicketTimeline } from './TicketTimeline';
import type { EmailItem } from './types';

const now = new Date(2026, 10, 16, 10, 0);
const ticket = createTickets(now).find((item) => item.id === 'T-1042')!;
const email = ticket.items[0] as EmailItem;

describe('TicketTimeline', () => {
  it('mixes an email card, an event, an internal note and a chat message', () => {
    render(<TicketTimeline items={ticket.items} users={users} onOpenEmail={jest.fn()} />);
    expect(screen.getByRole('log')).toBeInTheDocument();

    expect(screen.getByText('<nora@brightloop.example>')).toBeInTheDocument();
    expect(screen.getByText('To: support@lumen.example')).toBeInTheDocument();
    expect(screen.getByText(/^Hi, Our card was charged twice/)).toBeInTheDocument();

    expect(screen.getByText(/^Ticket created from email ·/)).toBeInTheDocument();

    const note = screen.getByText(/Stripe shows two captures/).closest('[data-note]');
    expect(note).toHaveTextContent('Maya Lindqvist');
    expect(note).toHaveTextContent('Internal note');

    const chat = screen.getByText(/following up on my email/).closest('.mantine-Message-root');
    expect(chat).not.toHaveAttribute('data-note');
    expect(chat).toHaveTextContent(/Nora Feld\s*\d/);
  });

  it('puts the note bar on the start edge, mirrored right to left', () => {
    const bar = () =>
      (screen.getByText(/Stripe shows two captures/).closest('[data-note]') as HTMLElement).style
        .boxShadow;
    const { unmount } = render(
      <TicketTimeline items={ticket.items} users={users} onOpenEmail={jest.fn()} />
    );
    expect(bar()).toBe('inset 3px 0 0 var(--mantine-color-yellow-filled)');
    unmount();

    render(
      <DirectionProvider initialDirection="rtl" detectDirection={false}>
        <TicketTimeline items={ticket.items} users={users} onOpenEmail={jest.fn()} />
      </DirectionProvider>
    );
    expect(bar()).toBe('inset -3px 0 0 var(--mantine-color-yellow-filled)');
  });

  it('opens an email from its card', async () => {
    const onOpenEmail = jest.fn();
    render(<TicketTimeline items={ticket.items} users={users} onOpenEmail={onOpenEmail} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Open email: Charged twice for the March invoice' })
    );
    expect(onOpenEmail).toHaveBeenCalledWith(email);
  });

  it('jumps to an item and flashes it through controlRef', () => {
    const control = React.createRef<MessageListControl>();
    render(
      <TicketTimeline
        items={ticket.items}
        users={users}
        controlRef={control}
        onOpenEmail={jest.fn()}
      />
    );
    const event = () => screen.getByText(/^Ticket created from email/).parentElement!;
    expect(event()).not.toHaveAttribute('data-highlighted');
    act(() => control.current!.jumpTo('T-1042-2'));
    expect(event()).toHaveAttribute('data-highlighted');
  });
});

describe('EmailModal', () => {
  function Harness({ initial }: { initial: EmailItem }) {
    const [open, setOpen] = useState<EmailItem | null>(initial);
    return <EmailModal email={open} onClose={() => setOpen(null)} />;
  }

  it('shows the headers and the plain-text body, and closes', async () => {
    render(<Harness initial={email} />);
    const dialog = screen.getByRole('dialog', { name: 'Charged twice for the March invoice' });
    expect(dialog).toHaveTextContent('FromNora Feld <nora@brightloop.example>');
    expect(dialog).toHaveTextContent('Tosupport@lumen.example');
    expect(dialog).toHaveTextContent('Ccap@brightloop.example');
    expect(dialog).toHaveTextContent('Date');
    expect(screen.getByText(/Finance, Brightloop/)).toHaveStyle({ whiteSpace: 'pre-wrap' });

    await userEvent.click(screen.getByRole('button', { name: 'Close email' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves out Cc when there is none', () => {
    const reply = createTickets(now)
      .find((item) => item.id === 'T-1040')!
      .items.find((item) => 'kind' in item && item.kind === 'email') as EmailItem;
    render(<EmailModal email={reply} onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Cc');
  });
});
