import { MantineProvider } from '@mantine/core';
import { act } from '@testing-library/react';
import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Renders `ui` inside an error boundary and returns the error it threw while rendering */
export function getRenderError(ui: ReactNode): unknown {
  let caught: unknown;
  const root = createRoot(document.createElement('div'), {
    onCaughtError: (error) => {
      caught = error;
    },
  });
  act(() =>
    root.render(
      <MantineProvider>
        <ErrorBoundary>{ui}</ErrorBoundary>
      </MantineProvider>
    )
  );
  act(() => root.unmount());
  return caught;
}
