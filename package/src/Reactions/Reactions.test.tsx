import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Reactions, ReactionsProps, ReactionsStylesNames } from './Reactions';
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const reactions = [
  { emoji: '👍', userIds: ['me', 'maya'] },
  { emoji: '🎉', userIds: ['maya'] },
  { emoji: '😂', userIds: [] },
];
const defaultProps: ReactionsProps = { reactions, currentUserId: 'me' };

const getRoot = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.mantine-Reactions-root')!;

describe('Reactions', () => {
  tests.axe([
    <Reactions {...defaultProps} />,
    <Reactions {...defaultProps} onToggleReaction={() => {}} />,
  ]);

  tests.itSupportsSystemProps<ReactionsProps, ReactionsStylesNames>({
    component: Reactions,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Reactions',
    stylesApiSelectors: ['root', 'reaction', 'emoji', 'count'],
  });

  itSupportsAttributes({
    component: Reactions,
    props: defaultProps,
    name: 'Reactions',
    selector: 'reaction',
  });

  it('shows counts, marks your own and skips empty ones', () => {
    render(<Reactions {...defaultProps} />);
    expect(screen.getByLabelText('👍 2, including you')).toHaveAttribute('data-active');
    expect(screen.getByLabelText('🎉 1')).not.toHaveAttribute('data-active');
    expect(screen.queryByText('😂')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('toggles with onToggleReaction, as pressed buttons, with custom labels', async () => {
    const onToggleReaction = jest.fn();
    render(
      <Reactions
        {...defaultProps}
        onToggleReaction={onToggleReaction}
        labels={{ reaction: ({ emoji, count }) => `${emoji}=${count}` }}
      />
    );
    expect(screen.getByRole('button', { name: '👍=2' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '🎉=1' }));
    expect(onToggleReaction).toHaveBeenCalledWith('🎉');
  });

  it('renders nothing without reactions', () => {
    const { container } = render(
      <Reactions reactions={[{ emoji: '😂', userIds: [] }]} currentUserId="me" />
    );
    expect(container.querySelector('.mantine-Reactions-root')).not.toBeInTheDocument();
  });

  itHasStaticVarsResolver({ component: Reactions });

  it('sets no theming variables by default', () => {
    const { container } = render(<Reactions {...defaultProps} />);
    const root = getRoot(container);
    for (const name of ['radius', 'active-bg', 'active-color', 'active-border']) {
      expect(root.style.getPropertyValue(`--reactions-${name}`)).toBe('');
    }
  });

  it('sets the radius and the colors of your reactions from props', () => {
    const { container } = render(<Reactions {...defaultProps} radius="xs" color="teal" />);
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--reactions-radius')).toBe('var(--mantine-radius-xs)');
    expect(root.style.getPropertyValue('--reactions-active-bg')).toBe(
      'var(--mantine-color-teal-light)'
    );
    expect(root.style.getPropertyValue('--reactions-active-color')).toBe(
      'var(--mantine-color-teal-light-color)'
    );
    expect(root.style.getPropertyValue('--reactions-active-border')).toBe(
      'var(--mantine-color-teal-filled)'
    );
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <Reactions {...defaultProps} vars={() => ({ root: { '--reactions-radius': '3px' } })} />
    );
    expect(getRoot(container).style.getPropertyValue('--reactions-radius')).toBe('3px');
  });

  it('passes unstyled to the buttons', () => {
    render(<Reactions {...defaultProps} onToggleReaction={() => {}} unstyled />);
    for (const element of screen.getAllByRole('button')) {
      expect([...element.classList].filter((name) => !name.startsWith('mantine-'))).toEqual([]);
    }
  });
});
