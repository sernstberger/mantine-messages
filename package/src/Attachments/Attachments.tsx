import {
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  Image,
  StylesApiProps,
  Text,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import { FileIcon } from '../icons';
import type { MessageAttachment } from '../types';
import { formatBytes } from '../utils/format';
import classes from './Attachments.module.css';

export type AttachmentsStylesNames = 'root' | 'image' | 'file';

export interface AttachmentsProps
  extends BoxProps, StylesApiProps<AttachmentsFactory>, ElementProps<'div'> {
  attachments: MessageAttachment[];

  /** Called when the user opens a file; without it each file is a link to its `url` */
  onOpen?: (attachment: MessageAttachment) => void;

  /** Locale for file sizes, the browser's by default */
  locale?: string;
}

export type AttachmentsFactory = Factory<{
  props: AttachmentsProps;
  ref: HTMLDivElement;
  stylesNames: AttachmentsStylesNames;
}>;

export const Attachments = factory<AttachmentsFactory>((_props) => {
  const props = useProps('Attachments', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    attachments,
    onOpen,
    locale,
    ...others
  } = props;

  const getStyles = useStyles<AttachmentsFactory>({
    name: 'Attachments',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    attributes,
  });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {attachments.map((attachment) => {
        const part = attachment.mimeType?.startsWith('image/') ? 'image' : 'file';
        const content =
          part === 'image' ? (
            <Image src={attachment.url} alt={attachment.name} radius="md" />
          ) : (
            <>
              <FileIcon />
              <Text component="span" size="sm" truncate>
                {attachment.name}
              </Text>
              {attachment.size !== undefined && (
                <Text component="span" size="xs" c="dimmed">
                  {formatBytes(attachment.size, locale)}
                </Text>
              )}
            </>
          );

        // With onOpen a button, else a link that opens the file in a new tab
        return onOpen ? (
          <UnstyledButton
            key={attachment.id}
            onClick={() => onOpen(attachment)}
            {...getStyles(part)}
          >
            {content}
          </UnstyledButton>
        ) : (
          <UnstyledButton
            key={attachment.id}
            component="a"
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            {...getStyles(part)}
          >
            {content}
          </UnstyledButton>
        );
      })}
    </Box>
  );
});

Attachments.displayName = 'Attachments';
Attachments.classes = classes;
