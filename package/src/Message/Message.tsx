import {
  Avatar,
  Box,
  BoxProps,
  CompoundStylesApiProps,
  createSafeContext,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import classes from './Message.module.css';

export type MessageStylesNames = 'root' | 'avatar' | 'body' | 'meta';

interface MessageContextValue {
  getStyles: GetStylesApi<MessageFactory>;
}

const [MessageProvider, useMessageContext] = createSafeContext<MessageContextValue>(
  'Message.Avatar, Message.Body and Message.Meta must be used inside Message'
);

export interface MessageAvatarProps
  extends BoxProps, CompoundStylesApiProps<MessageAvatarFactory>, ElementProps<'div'> {
  /** Name of the author, for the initials and the image's alt text */
  name: string;

  /** Image url; initials are shown when it is missing */
  src?: string | null;
}

export type MessageAvatarFactory = Factory<{
  props: MessageAvatarProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  compound: true;
}>;

/** Avatar in the first column */
export const MessageAvatar = factory<MessageAvatarFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, name, src, ...others } = useProps(
    'MessageAvatar',
    {},
    _props
  );
  const ctx = useMessageContext();

  return (
    <Avatar
      ref={ref}
      src={src}
      name={name}
      alt={name}
      size={36}
      radius="md"
      {...ctx.getStyles('avatar', { className, style, classNames, styles })}
      {...others}
    />
  );
});

MessageAvatar.displayName = 'MessageAvatar';
MessageAvatar.classes = classes;

export interface MessageBodyProps
  extends BoxProps, CompoundStylesApiProps<MessageBodyFactory>, ElementProps<'div'> {}

export type MessageBodyFactory = Factory<{
  props: MessageBodyProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  compound: true;
}>;

/** Content column: meta line, text and anything under it */
export const MessageBody = factory<MessageBodyFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'MessageBody',
    {},
    _props
  );
  const ctx = useMessageContext();

  return (
    <Box
      ref={ref}
      {...ctx.getStyles('body', { className, style, classNames, styles })}
      {...others}
    />
  );
});

MessageBody.displayName = 'MessageBody';
MessageBody.classes = classes;

export interface MessageMetaProps
  extends BoxProps, CompoundStylesApiProps<MessageMetaFactory>, ElementProps<'div'> {}

export type MessageMetaFactory = Factory<{
  props: MessageMetaProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  compound: true;
}>;

/** Name and time above the text; directly in `Message`, a time in the avatar column shown on hover */
export const MessageMeta = factory<MessageMetaFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'MessageMeta',
    {},
    _props
  );
  const ctx = useMessageContext();

  return (
    <Box
      ref={ref}
      {...ctx.getStyles('meta', { className, style, classNames, styles })}
      {...others}
    />
  );
});

MessageMeta.displayName = 'MessageMeta';
MessageMeta.classes = classes;

export interface MessageProps
  extends BoxProps, StylesApiProps<MessageFactory>, ElementProps<'div'> {
  /** A follow-up message of a group; sets `data-compact` for tighter spacing */
  compact?: boolean;
}

export type MessageFactory = Factory<{
  props: MessageProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  staticComponents: {
    Avatar: typeof MessageAvatar;
    Body: typeof MessageBody;
    Meta: typeof MessageMeta;
  };
}>;

/** One message as a row: an avatar column and a content column */
export const Message = factory<MessageFactory>((_props) => {
  const props = useProps('Message', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    compact,
    mod,
    ...others
  } = props;

  const getStyles = useStyles<MessageFactory>({
    name: 'Message',
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
    <MessageProvider value={{ getStyles }}>
      <Box ref={ref} mod={[{ compact }, mod]} {...getStyles('root')} {...others} />
    </MessageProvider>
  );
});

Message.displayName = 'Message';
Message.classes = classes;
Message.Avatar = MessageAvatar;
Message.Body = MessageBody;
Message.Meta = MessageMeta;
