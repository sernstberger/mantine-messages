import React, { createContext, useMemo } from 'react';
import type { MessageDate } from '../types';

export interface MessagesProviderValue {
  /** Locale for dates, times and file sizes @default 'en' */
  locale: string;

  /** IANA time zone for times and date dividers, for example `'America/New_York'`; the runtime's when not set */
  timeZone: string | undefined;

  /** The moment "Today", "Yesterday" and relative times count from; the current time when not set; pass a stable value, a new `Date` on every render updates every component below */
  now: MessageDate | undefined;
}

export type MessagesProviderSettings = Partial<MessagesProviderValue>;

export const MESSAGES_PROVIDER_DEFAULT_SETTINGS: MessagesProviderValue = {
  locale: 'en',
  timeZone: undefined,
  now: undefined,
};

export const MessagesProviderContext = createContext<MessagesProviderValue>(
  MESSAGES_PROVIDER_DEFAULT_SETTINGS
);

export interface MessagesProviderProps {
  /** Settings for every component below; a component's own `locale` and `timeZone` props win */
  settings: MessagesProviderSettings;
  children?: React.ReactNode;
}

/** Locale, time zone and "now" for every mantine-messages component below, like `DatesProvider` */
export function MessagesProvider({ settings, children }: MessagesProviderProps) {
  const { locale, timeZone, now } = { ...MESSAGES_PROVIDER_DEFAULT_SETTINGS, ...settings };
  const value = useMemo(() => ({ locale, timeZone, now }), [locale, timeZone, now]);

  return <MessagesProviderContext value={value}>{children}</MessagesProviderContext>;
}
