import React from 'react';
import { Inbox } from './Inbox';
import { sampleConversations } from '../sample-data';

export default { title: 'Inbox' };

export function Usage() {
  return (
    <div style={{ padding: 40, maxWidth: 360 }}>
      <Inbox conversations={sampleConversations} defaultValue="maya" />
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ padding: 40, maxWidth: 360 }}>
      <Inbox conversations={[]} />
    </div>
  );
}
