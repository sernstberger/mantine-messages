import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Reactions, ReactionsProps, ReactionsStylesNames } from './Reactions';

const reactions = [
  { emoji: '👍', userIds: ['me', 'maya'] },
  { emoji: '🎉', userIds: ['maya'] },
  { emoji: '😂', userIds: [] },
];
const defaultProps: ReactionsProps = { reactions, currentUserId: 'me' };

describe('Reactions', () => {
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
    stylesApiSelectors: ['root', 'reaction'],
  });

  it('shows counts, marks your own and skips empty ones', () => {
    render(<Reactions {...defaultProps} />);
    expect(screen.getByLabelText('👍 2, including you')).toHaveAttribute('data-active');
    expect(screen.getByLabelText('🎉 1')).not.toHaveAttribute('data-active');
    expect(screen.queryByText('😂')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('toggles with onToggle, as pressed buttons, with custom labels', async () => {
    const onToggle = jest.fn();
    render(
      <Reactions
        {...defaultProps}
        onToggle={onToggle}
        labels={{ reaction: ({ emoji, count }) => `${emoji}=${count}` }}
      />
    );
    expect(screen.getByRole('button', { name: '👍=2' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '🎉=1' }));
    expect(onToggle).toHaveBeenCalledWith('🎉');
  });

  it('renders nothing without reactions', () => {
    const { container } = render(
      <Reactions reactions={[{ emoji: '😂', userIds: [] }]} currentUserId="me" />
    );
    expect(container.querySelector('.mantine-Reactions-root')).not.toBeInTheDocument();
  });
});
