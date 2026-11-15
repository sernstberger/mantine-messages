import { Divider, Modal, Stack, Text } from '@mantine/core';
import React from 'react';
import { formatDateTime } from './queue';
import type { EmailItem } from './types';

export interface EmailModalProps {
  /** The email to show; null closes the modal */
  email: EmailItem | null;
  onClose: () => void;
}

function Header({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Text size="sm">
      <Text component="span" inherit c="dimmed" w={48} display="inline-block">
        {label}
      </Text>
      {children}
    </Text>
  );
}

/**
 * The body of an opened email, as plain text. This is the seam for phase 5: it becomes the email
 * renderer of mantine-doc-viewer (HTML in a sandboxed iframe, remote images blocked until allowed)
 */
export function EmailBody({ email }: { email: EmailItem }) {
  return (
    <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {email.text}
    </Text>
  );
}

/** The full email: headers, then the body */
export function EmailModal({ email, onClose }: EmailModalProps) {
  return (
    <Modal
      opened={email !== null}
      onClose={onClose}
      title={email?.subject}
      size="lg"
      closeButtonProps={{ 'aria-label': 'Close email' }}
    >
      {email && (
        <>
          <Stack gap={2}>
            <Header label="From">
              {email.from.name} &lt;{email.from.address}&gt;
            </Header>
            <Header label="To">{email.to.join(', ')}</Header>
            {email.cc && <Header label="Cc">{email.cc.join(', ')}</Header>}
            <Header label="Date">{formatDateTime(new Date(email.createdAt))}</Header>
          </Stack>
          <Divider my="sm" />
          <EmailBody email={email} />
        </>
      )}
    </Modal>
  );
}
