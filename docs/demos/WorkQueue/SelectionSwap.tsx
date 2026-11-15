import { Box } from '@mantine/core';
import React from 'react';

export interface SelectionSwapProps {
  /** Shows the bar instead of the children */
  active: boolean;

  /** The bulk bar */
  bar: React.ReactNode;

  /** The toolbar: filters, search, sort */
  children: React.ReactNode;
}

/**
 * A toolbar whose bulk bar takes its place while rows are selected, but not its height: the
 * toolbar stays laid out (hidden) and the bar covers it, so the rows below never move under the
 * pointer
 */
export function SelectionSwap({ active, bar, children }: SelectionSwapProps) {
  return (
    <Box
      p="sm"
      pos="relative"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Box style={{ visibility: active ? 'hidden' : undefined }}>{children}</Box>
      {active && (
        <Box pos="absolute" inset={0}>
          {bar}
        </Box>
      )}
    </Box>
  );
}
