import React, { createContext, use } from 'react';
import { plainTextMarkdownAdapter } from './plain-text-adapter';

type MarkdownRenderer<Tag extends 'a' | 'code' | 'pre'> = React.ComponentType<
  React.ComponentPropsWithoutRef<Tag>
>;

export interface MarkdownRenderers {
  /** Link, opens in a new tab */
  a: MarkdownRenderer<'a'>;

  /** Inline code */
  code: MarkdownRenderer<'code'>;

  /** Code block with its language and a copy button; its only child is the `code` element */
  pre: MarkdownRenderer<'pre'>;
}

export interface MarkdownAdapter {
  /** Renders one top-level block of markdown; `renderers` are MarkdownBody's Mantine elements */
  render: (markdown: string, renderers: MarkdownRenderers) => React.ReactNode;

  /**
   * MarkdownBody renders block by block, so a streaming answer reparses only its last block. Set
   * `false` when a plugin can change where blocks end: the text is then rendered whole
   * @default true
   */
  splitBlocks?: boolean;
}

export const MarkdownAdapterContext = createContext<MarkdownAdapter>(plainTextMarkdownAdapter);

export interface MarkdownAdapterProviderProps {
  /** Renders the markdown of every MarkdownBody below, `plainTextMarkdownAdapter` without a provider */
  adapter: MarkdownAdapter;
  children: React.ReactNode;
}

export function MarkdownAdapterProvider({ adapter, children }: MarkdownAdapterProviderProps) {
  return <MarkdownAdapterContext value={adapter}>{children}</MarkdownAdapterContext>;
}

export function useMarkdownAdapter() {
  return use(MarkdownAdapterContext);
}
