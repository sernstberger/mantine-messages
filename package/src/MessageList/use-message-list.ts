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

// How close to an edge, in px, still counts as at that edge
const BOTTOM = 80;
const TOP = 120;

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
  // A smooth scroll fires scroll events on its way down; they must not count as the user leaving
  const pinnedUntil = useRef(0);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const reduceMotion = useReducedMotion();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const flash = useTimeout(() => setHighlightedId(null), 1600);
  // `firstId` that onLoadOlder was last called for: scroll events can arrive before the app
  // re-renders with loadingOlder, so without this one scroll could ask twice
  const requestedFor = useRef<string | undefined>(undefined);

  // Older items arriving at the top must not be read out as new messages by the live log, so the
  // log stays aria-busy while they load and for the render that inserts them (React's "adjust
  // state while rendering" pattern, so the flag is already set in the commit that adds them)
  const [ids, setIds] = useState({ first: firstId, last: lastId });
  const [settling, setSettling] = useState(false);

  if (ids.first !== firstId || ids.last !== lastId) {
    setIds({ first: firstId, last: lastId });
    setSettling(ids.first !== undefined && firstId !== ids.first && lastId === ids.last);
  }

  useEffect(() => {
    if (settling) {
      setSettling(false);
    }
  }, [settling]);

  // When loading ends without new items (for example it failed), the user may ask again
  useIsomorphicEffect(() => {
    if (!loadingOlder) {
      requestedFor.current = undefined;
    }
  }, [loadingOlder]);

  // Runs after every render, so `previous.height` is always the height before this render
  useIsomorphicEffect(() => {
    const viewport = viewportRef.current!;
    const before = previous.current;
    previous.current = { first: firstId, last: lastId, height: viewport.scrollHeight };

    if (firstId === before.first && lastId === before.last) {
      // Same items, but the newest may have grown, for example an answer streaming in
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

  // Sizes also change without a render: the composer below grows a line and the viewport
  // shrinks, an image loads, fonts settle. While the user is at the bottom, stay there.
  // A plain ResizeObserver: Mantine's useResizeObserver keeps the size in state, which would
  // render the whole list on every change only to scroll
  const autoScrollRef = useRef(autoScroll);
  autoScrollRef.current = autoScroll;
  useEffect(() => {
    const viewport = viewportRef.current!;
    const observer = new ResizeObserver(() => {
      if (autoScrollRef.current && atBottom.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    // The viewport, and ScrollArea's content box inside it
    observer.observe(viewport);
    observer.observe(viewport.firstElementChild!);

    return () => observer.disconnect();
  }, []);

  const onScrollPositionChange = () => {
    const viewport = viewportRef.current!;

    if (Date.now() >= pinnedUntil.current) {
      atBottom.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM;
    }

    if (
      onLoadOlder &&
      hasOlder &&
      !loadingOlder &&
      requestedFor.current !== firstId &&
      viewport.scrollTop <= TOP
    ) {
      requestedFor.current = firstId;
      onLoadOlder();
    }
  };

  // Stable, so rows memoised on their context do not re-render when the list does
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
        // Focusable from code only, so the item adds no tab stop
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
    busy: loadingOlder || settling,
  };
}
