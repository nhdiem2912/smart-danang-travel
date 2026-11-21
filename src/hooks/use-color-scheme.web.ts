import { useSyncExternalStore } from 'react';
import {
  useColorScheme as useSystemColorScheme,
} from 'react-native';

import {
  useAppSettings,
} from '@/features/settings/settings-store';

const subscribe = () => () => {};
const client = () => true;
const server = () => false;

export function useColorScheme() {
  const hydrated = useSyncExternalStore(
    subscribe,
    client,
    server,
  );

  const system = useSystemColorScheme();
  const { settings } = useAppSettings();

  const selected = (
    settings?.theme === 'light' ||
    settings?.theme === 'dark'
  )
    ? settings.theme
    : system ?? 'light';

  return hydrated ? selected : 'light';
}