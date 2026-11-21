import {
    useColorScheme as useSystemColorScheme,
} from 'react-native';

import {
    useAppSettings,
} from '@/features/settings/settings-store';

export function useColorScheme() {
  const system = useSystemColorScheme();
  const { settings } = useAppSettings();

  return (
    settings?.theme === 'light' ||
    settings?.theme === 'dark'
  )
    ? settings.theme
    : system ?? 'light';
}