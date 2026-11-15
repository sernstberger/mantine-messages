import { useIsomorphicEffect, useReducedMotion, useTimeout } from '@mantine/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageListRowData } from './get-message-list-rows';
import type { MessageListRowsHandlers } from './MessageList';

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

  /** Rows of the list, so `jumpTo` can ask `rowsHandlersRef` for a row that is not rendered */
  rows?: MessageListRowData[];
}

const AT_BOTTOM_THRESHOLD_PX = 80;
const LOAD_OLDER_THRESHOLD_PX = 120;
const JUMP_WAIT_FRAMES = 60;
const PREPEND_SETTLE_FRAMES = 8;

function findItem(viewport: HTMLElement, id: string) {
  return Array.from(viewport.querySelectorAll<HTMLElement>('[data-item-id]')).find(
    (element) => element.dataset.itemId === id
  );
}

const topIn = (viewport: HTMLElement, element: HTMLElement) =>
  element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;

/** The first rendered item that reaches into the viewport, and how far from its top it sits */
function firstItemInView(viewport: HTMLElement) {
  const items = viewport.querySelectorAll<HTMLElement>('[data-item-id]');
  const viewportTop = viewport.getBoundingClientRect().top;
  let low = 0;
  let high = items.length - 1;
  let found: HTMLElement | undefined;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (items[middle].getBoundingClientRect().bottom > viewportTop) {
      found = items[middle];
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return found ? { id: found.dataset.itemId!, top: topIn(viewport, found) } : null;
}

/**
 * Viewport behaviour of a message list. Opens at the newest item; follows new items, and the newest one as it grows, while the
 * user is at the bottom or when they wrote them; keeps the view steady when older items are
 * prepended; asks for older items near the top; scrolls to an item and flashes it on request,
 * through `rowsHandlersRef` when only some rows are rendered.
 */
export function useMessageList({
  autoScroll,
  firstId,
  lastId,
  lastIsOwn,
  onLoadOlder,
  hasOlder = false,
  loadingOlder = false,
  rows = [],
}: UseMessageListOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const rowsHandlersRef = useRef<MessageListRowsHandlers>(null);
  const pendingJump = useRef(0);
  const settlingPrepend = useRef(0);
  const keptInPlace = useRef<{ id: string; top: number } | null>(null);
  const atBottom = useRef(true);
  const ignoreScrollPositionUntil = useRef(0);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const reduceMotion = useReducedMotion();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const flash = useTimeout(() => setHighlightedId(null), 1600);
  const loadOlderRequestedForFirstId = useRef<string | undefined>(undefined);
  const prependAnchor = useRef<{ id: string; top: number } | null>(null);

  // Set during render, so the live log is already aria-busy in the commit that prepends older items
  const [ids, setIds] = useState({ first: firstId, last: lastId });
  const [prependingOlder, setPrependingOlder] = useState(false);

  if (ids.first !== firstId || ids.last !== lastId) {
    const prepending = ids.first !== undefined && firstId !== ids.first && lastId === ids.last;
    setIds({ first: firstId, last: lastId });
    setPrependingOlder(prepending);
    // Read before the commit that adds the older items, so the item in view stays where it is
    prependAnchor.current = prepending ? firstItemInView(viewportRef.current!) : null;
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

  const keepInPlace = () => {
    const viewport = viewportRef.current!;
    const anchor = keptInPlace.current;
    const element = anchor && findItem(viewport, anchor.id);
    const drift = element ? topIn(viewport, element) - anchor.top : 0;

    if (Math.abs(drift) >= 1) {
      viewport.scrollTop += drift;
    }
  };

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
      const anchor = prependAnchor.current;
      const element = anchor && findItem(viewport, anchor.id);
      viewport.scrollTop += element
        ? topIn(viewport, element) - anchor.top
        : viewport.scrollHeight - before.height;

      if (anchor) {
        // A windowed list renders and measures the rows around the anchor over the next frames
        keptInPlace.current = anchor;
        cancelAnimationFrame(settlingPrepend.current);
        let frames = 0;
        const settle = () => {
          keepInPlace();

          if (++frames < PREPEND_SETTLE_FRAMES) {
            settlingPrepend.current = requestAnimationFrame(settle);
          } else {
            keptInPlace.current = null;
          }
        };
        settlingPrepend.current = requestAnimationFrame(settle);
      }

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
  const keepInPlaceRef = useRef(keepInPlace);
  keepInPlaceRef.current = keepInPlace;
  useEffect(() => {
    const viewport = viewportRef.current!;
    const observer = new ResizeObserver(() => {
      if (autoScrollRef.current && atBottom.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }

      keepInPlaceRef.current();

      // A windowed list grows as it measures rows, without a render of the list
      previous.current.height = viewport.scrollHeight;
    });
    const scrollAreaContent = viewport.firstElementChild!;
    observer.observe(viewport);
    observer.observe(scrollAreaContent);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(pendingJump.current);
      cancelAnimationFrame(settlingPrepend.current);
    };
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

  const latest = useRef({ reduceMotion, flash, rows });
  latest.current = { reduceMotion, flash, rows };
  const jumpTo = useCallback((id: string, { focus = true }: MessageListJumpOptions = {}) => {
    const reveal = (target: HTMLElement, behavior: ScrollBehavior) => {
      target.scrollIntoView({ block: 'center', behavior });

      if (focus) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    };

    cancelAnimationFrame(pendingJump.current);
    atBottom.current = false;
    ignoreScrollPositionUntil.current = 0;
    const target = findItem(viewportRef.current!, id);
    const index = latest.current.rows.findIndex((row) => row.type === 'item' && row.key === id);

    if (target) {
      reveal(target, latest.current.reduceMotion ? 'auto' : 'smooth');
    } else if (index !== -1 && rowsHandlersRef.current) {
      rowsHandlersRef.current.scrollToIndex(index);
      let frames = 0;
      const waitForRow = () => {
        const mounted = findItem(viewportRef.current!, id);

        if (mounted) {
          reveal(mounted, 'auto');
        } else if (++frames < JUMP_WAIT_FRAMES) {
          pendingJump.current = requestAnimationFrame(waitForRow);
        }
      };
      pendingJump.current = requestAnimationFrame(waitForRow);
    }

    latest.current.flash.clear();
    setHighlightedId(id);
    latest.current.flash.start();
  }, []);

  return {
    viewportRef,
    rowsHandlersRef,
    onScrollPositionChange,
    jumpTo,
    highlightedId,
    busy: loadingOlder || prependingOlder,
  };
}
