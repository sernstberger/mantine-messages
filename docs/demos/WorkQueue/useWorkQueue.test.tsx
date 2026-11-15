import { renderHook } from '@testing-library/react';
import { MessagesProvider } from 'mantine-messages';
import React from 'react';
import { useWorkQueue } from './useWorkQueue';

describe('useWorkQueue', () => {
  it('takes now from MessagesProvider, so a server render and the browser agree', () => {
    const now = Date.UTC(2026, 10, 15, 15, 30);
    const { result } = renderHook(() => useWorkQueue(), {
      wrapper: ({ children }) => <MessagesProvider settings={{ now }}>{children}</MessagesProvider>,
    });
    expect(result.current.now.getTime()).toBe(now);
  });

  it('prefers its own now', () => {
    const now = new Date(2026, 0, 1);
    const { result } = renderHook(() => useWorkQueue(now), {
      wrapper: ({ children }) => (
        <MessagesProvider settings={{ now: Date.UTC(2026, 10, 15) }}>{children}</MessagesProvider>
      ),
    });
    expect(result.current.now).toBe(now);
  });
});
