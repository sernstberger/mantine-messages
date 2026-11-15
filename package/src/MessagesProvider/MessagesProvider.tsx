import React, { createContext } from 'react';
import type { MessageDate } from '../types';

export interface MessagesProviderValue {
  /** Locale for dates, times and file sizes, `'en'` by default */
  locale: string;

  /** IANA time zone for times and date dividers, for example `'America/New_York'`; the runtime's by default */
  timeZone: string | undefined;

  /** The moment "Today", "Yesterday" and relative times count from; the current time by default */
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
  return (
    <MessagesProviderContext value={{ ...MESSAGES_PROVIDER_DEFAULT_SETTINGS, ...settings }}>
      {children}
    </MessagesProviderContext>
  );
}
