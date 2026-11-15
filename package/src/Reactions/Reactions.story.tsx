import { Box } from '@mantine/core';
import React, { useState } from 'react';
import type { MessageReaction } from '../types';
import { Reactions } from './Reactions';

export default { title: 'Reactions' };

export function Usage() {
  const [reactions, setReactions] = useState<MessageReaction[]>([
    { emoji: '👍', userIds: ['me', 'maya'] },
    { emoji: '🎉', userIds: ['theo'] },
  ]);

  const toggle = (emoji: string) =>
    setReactions((current) =>
      current.map((reaction) =>
        reaction.emoji === emoji
          ? {
              ...reaction,
              userIds: reaction.userIds.includes('me')
                ? reaction.userIds.filter((id) => id !== 'me')
                : [...reaction.userIds, 'me'],
            }
          : reaction
      )
    );

  return (
    <Box p="xl">
      <Reactions reactions={reactions} currentUserId="me" onToggleReaction={toggle} />
    </Box>
  );
}
