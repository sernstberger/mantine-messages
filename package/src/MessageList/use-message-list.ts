import { useIsomorphicEffect, useReducedMotion, useTimeout } from '@mantine/hooks';
import { useRef, useState } from 'react';

export interface UseMessageListOptions {
  /** Keep the newest item in view */
  autoScroll: boolean;

  /** `id` of the oldest item */
  firstId?: string;

  /** `id` of the newest item */
  lastId?: string;

  /** The newest item was written by the current user */
  lastIsOwn: boolean;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;
  hasOlder?: boolean;
  loadingOlder?: boolean;
}

// How close to an edge, in px, still counts as at that edge
const BOTTOM = 80;
const TOP = 120;

/**
 * Viewport behaviour of a message list. Opens at the newest item; follows new items while the
 * user is at the bottom or when they wrote them; keeps the view steady when older items are
 * prepended; asks for older items near the top; scrolls to an item and flashes it on request.
 */
export function useMessageList({
  autoScroll,
  firstId,
  lastId,
  lastIsOwn,
  onLoadOlder,
  hasOlder = false,
  loadingOlder = false,
}: UseMessageListOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  // A smooth scroll fires scroll events on its way down; they must not count as the user leaving
  const pinnedUntil = useRef(0);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const reduceMotion = useReducedMotion();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const flash = useTimeout(() => setHighlightedId(null), 1600);

  // Runs after every render, so `previous.height` is always the height before this render
  useIsomorphicEffect(() => {
    const viewport = viewportRef.current!;
    const before = previous.current;
    previous.current = { first: firstId, last: lastId, height: viewport.scrollHeight };

    if (firstId === before.first && lastId === before.last) {
      return;
    }

    const prepended =
      before.first !== undefined && firstId !== before.first && lastId === before.last;

    if (prepended) {
      viewport.scrollTop += viewport.scrollHeight - before.height;
      return;
    }

    // Ids changed and nothing was prepended, so the newest item is new
    if (!autoScroll) {
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
  });

  const onScrollPositionChange = () => {
    const viewport = viewportRef.current!;

    if (Date.now() >= pinnedUntil.current) {
      atBottom.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM;
    }

    if (onLoadOlder && hasOlder && !loadingOlder && viewport.scrollTop <= TOP) {
      onLoadOlder();
    }
  };

  const jumpTo = (id: string) => {
    Array.from(viewportRef.current!.querySelectorAll<HTMLElement>('[data-item-id]'))
      .find((element) => element.dataset.itemId === id)
      ?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    flash.clear();
    setHighlightedId(id);
    flash.start();
  };

  return { viewportRef, onScrollPositionChange, jumpTo, highlightedId };
}
