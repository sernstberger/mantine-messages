import { useIsomorphicEffect, useReducedMotion, useTimeout } from '@mantine/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Options of `jumpTo` */
export interface MessageListJumpOptions {
  /**
   * Move keyboard focus to the item, so screen readers read it and Tab continues from it,
   * `true` by default; pass `false` when focus must stay where it is, for example in a search box
   */
  focus?: boolean;
}

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

const AT_BOTTOM_THRESHOLD_PX = 80;
const LOAD_OLDER_THRESHOLD_PX = 120;

/**
 * Viewport behaviour of a message list. Opens at the newest item; follows new items, and the newest one as it grows, while the
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
  const ignoreScrollPositionUntil = useRef(0);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const reduceMotion = useReducedMotion();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const flash = useTimeout(() => setHighlightedId(null), 1600);
  const loadOlderRequestedForFirstId = useRef<string | undefined>(undefined);

  // Set during render, so the live log is already aria-busy in the commit that prepends older items
  const [ids, setIds] = useState({ first: firstId, last: lastId });
  const [prependingOlder, setPrependingOlder] = useState(false);

  if (ids.first !== firstId || ids.last !== lastId) {
    setIds({ first: firstId, last: lastId });
    setPrependingOlder(ids.first !== undefined && firstId !== ids.first && lastId === ids.last);
  }

  useEffect(() => {
    if (prependingOlder) {
      setPrependingOlder(false);
    }
  }, [prependingOlder]);

  useIsomorphicEffect(() => {
    if (!loadingOlder) {
      loadOlderRequestedForFirstId.current = undefined;
    }
  }, [loadingOlder]);

  useIsomorphicEffect(() => {
    const viewport = viewportRef.current!;
    const before = previous.current;
    previous.current = { first: firstId, last: lastId, height: viewport.scrollHeight };

    if (firstId === before.first && lastId === before.last) {
      if (autoScroll && atBottom.current && viewport.scrollHeight > before.height) {
        viewport.scrollTop = viewport.scrollHeight;
      }

      return;
    }

    const prepended =
      before.first !== undefined && firstId !== before.first && lastId === before.last;

    if (prepended) {
      viewport.scrollTop += viewport.scrollHeight - before.height;
      return;
    }

    if (!autoScroll) {
      return;
    }

    const fresh = firstId !== before.first;

    if (fresh || atBottom.current || lastIsOwn) {
      atBottom.current = true;
      ignoreScrollPositionUntil.current = Date.now() + 600;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: fresh || reduceMotion ? 'auto' : 'smooth',
      });
    }
  });

  // Not useResizeObserver: it keeps the size in state, which would render the whole list to scroll
  const autoScrollRef = useRef(autoScroll);
  autoScrollRef.current = autoScroll;
  useEffect(() => {
    const viewport = viewportRef.current!;
    const observer = new ResizeObserver(() => {
      if (autoScrollRef.current && atBottom.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    const scrollAreaContent = viewport.firstElementChild!;
    observer.observe(viewport);
    observer.observe(scrollAreaContent);

    return () => observer.disconnect();
  }, []);

  const onScrollPositionChange = () => {
    const viewport = viewportRef.current!;

    if (Date.now() >= ignoreScrollPositionUntil.current) {
      atBottom.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <=
        AT_BOTTOM_THRESHOLD_PX;
    }

    if (
      onLoadOlder &&
      hasOlder &&
      !loadingOlder &&
      loadOlderRequestedForFirstId.current !== firstId &&
      viewport.scrollTop <= LOAD_OLDER_THRESHOLD_PX
    ) {
      loadOlderRequestedForFirstId.current = firstId;
      onLoadOlder();
    }
  };

  const latest = useRef({ reduceMotion, flash });
  latest.current = { reduceMotion, flash };
  const jumpTo = useCallback((id: string, { focus = true }: MessageListJumpOptions = {}) => {
    const target = Array.from(
      viewportRef.current!.querySelectorAll<HTMLElement>('[data-item-id]')
    ).find((element) => element.dataset.itemId === id);

    if (target) {
      target.scrollIntoView({
        block: 'center',
        behavior: latest.current.reduceMotion ? 'auto' : 'smooth',
      });

      if (focus) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }

    latest.current.flash.clear();
    setHighlightedId(id);
    latest.current.flash.start();
  }, []);

  return {
    viewportRef,
    onScrollPositionChange,
    jumpTo,
    highlightedId,
    busy: loadingOlder || prependingOlder,
  };
}
