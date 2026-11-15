import React from 'react';
import { Composer } from './Composer';

export default { title: 'Composer' };

export function Usage() {
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <Composer placeholder="Write a message" />
    </div>
  );
}
