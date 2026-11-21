import { useEffect } from 'react';
import {
    Appearance,
    AppState,
    Platform,
} from 'react-native';

import {
    settingsStore,
    useAppSettings,
} from './settings-store';

import {
    listenForNotifications,
    refreshNotifications,
} from './settings-notifications';

export function SettingsRuntime() {
  const { settings, ready } = useAppSettings();

  const theme = settings?.theme;
  const language = settings?.language;
  const reminders = settings?.remindersEnabled;

  useEffect(() => {
    if (
      ready &&
      theme &&
      Platform.OS !== 'web'
    ) {
      Appearance.setColorScheme(
        theme === 'system' ? 'auto' : theme,
      );
    }
  }, [ready, theme]);

  useEffect(() => {
    if (ready) {
      void refreshNotifications();
    }
  }, [ready, language, reminders]);

  useEffect(() => {
    const stop = listenForNotifications();

    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          if (
            state === 'active' &&
            settingsStore.getSnapshot().ready
          ) {
            void refreshNotifications();
          }
        },
      );

    return () => {
      stop();
      subscription.remove();
    };
  }, []);

  return null;
}