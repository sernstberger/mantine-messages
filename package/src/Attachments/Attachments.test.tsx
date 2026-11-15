import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Attachments, AttachmentsProps, AttachmentsStylesNames } from './Attachments';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const attachments = [
  { id: '1', name: 'menu.png', url: '/menu.png', mimeType: 'image/png' },
  { id: '2', name: 'invoice.pdf', url: '/invoice.pdf', mimeType: 'application/pdf', size: 2048 },
  { id: '3', name: 'notes', url: '/notes' },
];
const defaultProps: AttachmentsProps = { attachments };

describe('Attachments', () => {
  tests.itSupportsSystemProps<AttachmentsProps, AttachmentsStylesNames>({
    component: Attachments,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Attachments',
    stylesApiSelectors: ['root', 'image', 'file'],
  });

  itSupportsAttributes({
    component: Attachments,
    props: defaultProps,
    name: 'Attachments',
    selector: 'file',
  });

  it('links to each file in a new tab without onOpen', () => {
    render(<Attachments {...defaultProps} locale="en-US" />);
    expect(screen.getByRole('img', { name: 'menu.png' })).toBeInTheDocument();
    const pdf = screen.getByRole('link', { name: /invoice\.pdf/ });
    expect(pdf).toHaveAttribute('href', '/invoice.pdf');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveTextContent('2 KB');
    expect(screen.getByRole('link', { name: 'notes' })).toBeInTheDocument();
  });

  it('calls onOpen instead when given', async () => {
    const onOpen = jest.fn();
    render(<Attachments {...defaultProps} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'menu.png' }));
    await userEvent.click(screen.getByRole('button', { name: /invoice\.pdf/ }));
    expect(onOpen.mock.calls.map(([attachment]) => attachment.id)).toEqual(['1', '2']);
  });
});
