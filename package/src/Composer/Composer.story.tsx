import { Box } from '@mantine/core';
import React from 'react';
import { Composer } from './Composer';

export default { title: 'Composer' };

export function Usage() {
  return (
    <Box p="xl" maw={480}>
      <Composer placeholder="Write a message" />
    </Box>
  );
}
