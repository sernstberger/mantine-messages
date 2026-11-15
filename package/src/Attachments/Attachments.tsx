import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getRadius,
  Image,
  MantineRadius,
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

export type AttachmentsStylesNames =
  | 'root'
  | 'image'
  | 'file'
  | 'fileIcon'
  | 'fileName'
  | 'fileSize';

export type AttachmentsCssVariables = {
  root: '--attachments-radius' | '--attachments-image-max-width' | '--attachments-file-max-width';
};

export interface AttachmentsProps
  extends BoxProps, StylesApiProps<AttachmentsFactory>, ElementProps<'div'> {
  attachments: MessageAttachment[];

  /** Called when the user opens a file; without it each file is a link to its `url` */
  onOpen?: (attachment: MessageAttachment) => void;

  /** Locale for file sizes, the browser's by default */
  locale?: string;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of images and files, numbers are converted to rem @default 'md' */
  radius?: MantineRadius;
}

export type AttachmentsFactory = Factory<{
  props: AttachmentsProps;
  ref: HTMLDivElement;
  stylesNames: AttachmentsStylesNames;
  vars: AttachmentsCssVariables;
}>;

const varsResolver = createVarsResolver<AttachmentsFactory>((_theme, { radius }) => ({
  root: {
    '--attachments-radius': radius === undefined ? undefined : getRadius(radius),
    '--attachments-image-max-width': undefined,
    '--attachments-file-max-width': undefined,
  },
}));

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
    radius,
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
    varsResolver,
  });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {attachments.map((attachment) => {
        const part = attachment.mimeType?.startsWith('image/') ? 'image' : 'file';
        const content =
          part === 'image' ? (
            <Image
              src={attachment.url}
              alt={attachment.name}
              unstyled={unstyled}
              loading="lazy"
              decoding="async"
              width={attachment.width}
              height={attachment.height}
            />
          ) : (
            <>
              <span {...getStyles('fileIcon')}>
                <FileIcon />
              </span>
              <Text
                component="span"
                size="sm"
                truncate
                unstyled={unstyled}
                {...getStyles('fileName')}
              >
                {attachment.name}
              </Text>
              {attachment.size !== undefined && (
                <Text component="span" size="xs" unstyled={unstyled} {...getStyles('fileSize')}>
                  {formatBytes(attachment.size, locale)}
                </Text>
              )}
            </>
          );

        return onOpen ? (
          <UnstyledButton
            key={attachment.id}
            unstyled={unstyled}
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
            unstyled={unstyled}
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
Attachments.varsResolver = varsResolver;

export namespace Attachments {
  export type Props = AttachmentsProps;
  export type StylesNames = AttachmentsStylesNames;
  export type Factory = AttachmentsFactory;
  export type CssVariables = AttachmentsCssVariables;
}
