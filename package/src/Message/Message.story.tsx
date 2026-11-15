import React from 'react';
import { Message } from './Message';

export default { title: 'Message' };

export function Usage() {
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <Message>
        <Message.Avatar name="Maya Lindqvist" />
        <Message.Body>
          <Message.Meta>Maya Lindqvist, 10:42</Message.Meta>
          Did the venue confirm for Saturday?
        </Message.Body>
      </Message>
    </div>
  );
}
