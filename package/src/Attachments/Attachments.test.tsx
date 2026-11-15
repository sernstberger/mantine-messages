import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Attachments, AttachmentsProps, AttachmentsStylesNames } from './Attachments';
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const attachments = [
  { id: '1', name: 'menu.png', url: '/menu.png', mimeType: 'image/png' },
  { id: '2', name: 'invoice.pdf', url: '/invoice.pdf', mimeType: 'application/pdf', size: 2048 },
  { id: '3', name: 'notes', url: '/notes' },
];
const defaultProps: AttachmentsProps = { attachments };

const getRoot = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.mantine-Attachments-root')!;

describe('Attachments', () => {
  tests.axe([
    <Attachments {...defaultProps} />,
    <Attachments {...defaultProps} onOpen={() => {}} />,
  ]);

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
    stylesApiSelectors: ['root', 'image', 'file', 'fileIcon', 'fileName', 'fileSize'],
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

  it('loads images lazily, with their size when known', () => {
    render(
      <Attachments
        attachments={[
          attachments[0],
          {
            id: '4',
            name: 'map.jpg',
            url: '/map.jpg',
            mimeType: 'image/jpeg',
            width: 800,
            height: 600,
          },
        ]}
      />
    );
    const menu = screen.getByRole('img', { name: 'menu.png' });
    expect(menu).toHaveAttribute('loading', 'lazy');
    expect(menu).toHaveAttribute('decoding', 'async');
    expect(menu).not.toHaveAttribute('width');
    const map = screen.getByRole('img', { name: 'map.jpg' });
    expect(map).toHaveAttribute('width', '800');
    expect(map).toHaveAttribute('height', '600');
  });

  it('calls onOpen instead when given', async () => {
    const onOpen = jest.fn();
    render(<Attachments {...defaultProps} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'menu.png' }));
    await userEvent.click(screen.getByRole('button', { name: /invoice\.pdf/ }));
    expect(onOpen.mock.calls.map(([attachment]) => attachment.id)).toEqual(['1', '2']);
  });

  itHasStaticVarsResolver({ component: Attachments });

  it('sets no theming variables by default', () => {
    const { container } = render(<Attachments {...defaultProps} />);
    const root = getRoot(container);
    for (const name of ['radius', 'image-max-width', 'file-max-width']) {
      expect(root.style.getPropertyValue(`--attachments-${name}`)).toBe('');
    }
  });

  it('sets the radius from props', () => {
    const { container } = render(<Attachments {...defaultProps} radius="xs" />);
    expect(getRoot(container).style.getPropertyValue('--attachments-radius')).toBe(
      'var(--mantine-radius-xs)'
    );
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <Attachments
        {...defaultProps}
        vars={() => ({ root: { '--attachments-image-max-width': '10rem' } })}
      />
    );
    expect(getRoot(container).style.getPropertyValue('--attachments-image-max-width')).toBe(
      '10rem'
    );
  });

  it('passes unstyled to the components it renders', () => {
    const { container } = render(<Attachments {...defaultProps} unstyled />);
    const { container: opening } = render(
      <Attachments {...defaultProps} onOpen={() => {}} unstyled />
    );
    const names = ['UnstyledButton', 'Image', 'Text'];
    for (const root of [container, opening]) {
      for (const name of names) {
        const elements = root.querySelectorAll(`.mantine-${name}-root`);
        expect(elements.length).toBeGreaterThan(0);
        for (const element of elements) {
          expect([...element.classList].filter((cls) => !cls.startsWith('mantine-'))).toEqual([]);
        }
      }
    }
  });
});
