import { useIsomorphicEffect, useReducedMotion } from '@mantine/hooks';
import { RefObject, useRef } from 'react';

interface StickToBottomOptions {
  enabled: boolean;

  /** `id` of the oldest message; a new one with a new newest message means a new conversation */
  firstId?: string;

  /** `id` of the newest message */
  lastId?: string;

  /** The newest message was written by the current user */
  lastIsOwn: boolean;

  /** How close to the bottom, in px, still counts as at the bottom */
  threshold?: number;
}

/**
 * Keeps a thread's viewport at the newest message: jumps there when a conversation opens, follows
 * new messages while the user is at the bottom or when they sent the message, and leaves the
 * view alone while they read older messages. Loading older messages at the top never scrolls.
 * Returns the handler for ScrollArea's `onScrollPositionChange`.
 */
export function useStickToBottom(
  viewportRef: RefObject<HTMLDivElement | null>,
  { enabled, firstId, lastId, lastIsOwn, threshold = 80 }: StickToBottomOptions
) {
  const atBottom = useRef(true);
  // A smooth scroll fires scroll events on its way down; they must not count as the user leaving
  const pinnedUntil = useRef(0);
  const previous = useRef<{ first?: string; last?: string }>({});
  const reduceMotion = useReducedMotion();

  useIsomorphicEffect(() => {
    const viewport = viewportRef.current!;
    const before = previous.current;
    previous.current = { first: firstId, last: lastId };

    if (!enabled || lastId === before.last) {
      return;
    }

    const fresh = firstId !== before.first;

    if (fresh || atBottom.current || lastIsOwn) {
      atBottom.current = true;
      pinnedUntil.current = Date.now() + 600;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: fresh || reduceMotion ? 'auto' : 'smooth',
      });
    }
  }, [enabled, firstId, lastId]);

  return () => {
    const viewport = viewportRef.current!;

    if (Date.now() >= pinnedUntil.current) {
      atBottom.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= threshold;
    }
  };
}
