import React from 'react';
import { Attachments } from './Attachments';

export default { title: 'Attachments' };

export function Usage() {
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <Attachments
        attachments={[
          {
            id: 'a1',
            name: 'deposit-invoice.pdf',
            url: '#',
            mimeType: 'application/pdf',
            size: 184320,
          },
          { id: 'a2', name: 'menu-options.docx', url: '#', size: 48200 },
        ]}
      />
    </div>
  );
}
