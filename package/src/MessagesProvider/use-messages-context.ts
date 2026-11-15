import { use, useCallback, useMemo } from 'react';
import type { DateSettings } from '../utils/format';
import { MessagesProviderContext } from './MessagesProvider';

/** The `MessagesProvider` settings; `getLocale` and `getTimeZone` prefer a component's own prop */
export function useMessagesContext() {
  const ctx = use(MessagesProviderContext);
  const getLocale = useCallback((input?: string) => input || ctx.locale, [ctx.locale]);
  const getTimeZone = useCallback((input?: string) => input || ctx.timeZone, [ctx.timeZone]);

  return { ...ctx, getLocale, getTimeZone };
}

export function useDateSettings(locale?: string, timeZone?: string): DateSettings {
  const ctx = use(MessagesProviderContext);
  const resolvedLocale = locale || ctx.locale;
  const resolvedTimeZone = timeZone || ctx.timeZone;

  return useMemo(
    () => ({ locale: resolvedLocale, timeZone: resolvedTimeZone, now: ctx.now }),
    [resolvedLocale, resolvedTimeZone, ctx.now]
  );
}
