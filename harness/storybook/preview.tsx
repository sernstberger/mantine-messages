// Deviation: styles imported here, and no preview-head.html (Mantine's loads a CDN stylesheet; e2e runs offline)
import '@mantine/core/styles.css';
import React, { useEffect } from 'react';
import { TextAlignLeftIcon, TextAlignRightIcon } from '@phosphor-icons/react';
// Deviation: @storybook/react-vite, not Mantine's @storybook/nextjs (a library on Vite, not a Next app)
import type { Decorator, Preview } from '@storybook/react-vite';
import { useGlobals } from 'storybook/preview-api';
import { ActionIcon, DirectionProvider, MantineProvider, useDirection } from '@mantine/core';
// Deviation: the repo's theme and decorators (Mantine: its docs theme, CodeHighlight and Modals decorators)
import { repoDecorators, repoTheme } from './repo';

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Mantine color scheme',
    defaultValue: 'light',
    toolbar: {
      icon: 'mirror',
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' },
      ],
    },
  },
};

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    // Deviation: Storybook reads these parameters over the named export below, so Mantine's
    // showPanel there never applies; repeated here so the panel stays closed
    options: { showPanel: false },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

export const parameters = {
  layout: 'fullscreen',
  options: {
    showPanel: false,
    // Storybook fails to compile if `(a: any, b: any)` is added to storySort function
    // @ts-expect-error
    storySort: (a, b) => {
      // Deviation: showcase apps (Apps/*) sort last; Mantine has none
      const isAppA = a.title.startsWith('Apps/');
      const isAppB = b.title.startsWith('Apps/');

      if (isAppA !== isAppB) {
        return isAppA ? 1 : -1;
      }

      return a.title.localeCompare(b.title, undefined, { numeric: true });
    },
  },
};

function DirectionWrapper({ children }: { children: React.ReactNode }) {
  const { dir, toggleDirection } = useDirection();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isToggleDirection = event.altKey && event.shiftKey && event.code === 'KeyR';

      if (!isToggleDirection) {
        return;
      }

      event.preventDefault();
      toggleDirection();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleDirection]);

  return (
    <>
      <ActionIcon
        size="xl"
        radius="md"
        variant="default"
        pos="fixed"
        bottom={20}
        right={20}
        onClick={toggleDirection}
        style={{ zIndex: 1000 }}
        aria-label="Toggle text direction"
      >
        {dir === 'ltr' ? <TextAlignLeftIcon /> : <TextAlignRightIcon />}
      </ActionIcon>
      {children}
    </>
  );
}

export const decorators: Decorator[] = [
  ...repoDecorators,
  (renderStory, context) => {
    const [{ theme: globalTheme }, updateGlobals] = useGlobals();

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        const isMod = event.metaKey || event.ctrlKey;
        const isJ = event.code === 'KeyJ';

        if (!isMod || !isJ) {
          return;
        }

        event.preventDefault();
        updateGlobals({ theme: globalTheme === 'dark' ? 'light' : 'dark' });
      };

      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [globalTheme, updateGlobals]);

    const scheme = (context.globals.theme || 'light') as 'light' | 'dark';
    // Deviation: StrictMode (Mantine has none) mounts, unmounts and mounts again in development, so
    // effects that do not clean up after themselves show up in storybook dev and e2e:dev
    return (
      <React.StrictMode>
        <DirectionProvider initialDirection="ltr" detectDirection={false}>
          <MantineProvider theme={repoTheme} forceColorScheme={scheme}>
            <DirectionWrapper>{renderStory()}</DirectionWrapper>
          </MantineProvider>
        </DirectionProvider>
      </React.StrictMode>
    );
  },
];
