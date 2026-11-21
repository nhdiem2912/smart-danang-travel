import * as Notifications from 'expo-notifications';
import {
    AndroidImportance,
    IosAuthorizationStatus,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { translate } from './settings-i18n';
import {
    addNotice,
    SettingsError,
    settingsStore,
    type AppSettings,
    type ErrorCode,
} from './settings-store';

const DAILY_ID =
  'smart-danang-travel.settings.daily.v1';

const CHANNEL = 'travel-reminders';
const KIND = 'smart-danang-travel.settings.v1';

const SERVER = {
  ready: false,
  granted: false,
  scheduled: false,
  error: null as ErrorCode | null,
};

let status = SERVER;
let queue: Promise<unknown> = Promise.resolve();

const listeners = new Set<() => void>();

const publish = (next: typeof SERVER) => {
  status = next;
  listeners.forEach(listener => listener());
};

export const notificationStatus = {
  getSnapshot: () => status,
  getServerSnapshot: () => SERVER,
  subscribe: (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

function serial<T>(
  work: () => Promise<T>,
): Promise<T> {
  const next = queue.then(work);
  queue = next.catch(() => {});

  return next;
}

async function readSettings() {
  await settingsStore.load();

  const snapshot = settingsStore.getSnapshot();

  if (
    !snapshot.ready ||
    !snapshot.settings
  ) {
    throw new SettingsError('loadError');
  }

  return snapshot.settings;
}

function granted(
  permission: Notifications.NotificationPermissionsStatus,
) {
  return (
    permission.granted ||
    permission.ios?.status ===
      IosAuthorizationStatus.PROVISIONAL
  );
}

async function channel(settings: AppSettings) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      CHANNEL,
      {
        name: translate(
          settings.language,
          'reminder',
        ),
        importance: AndroidImportance.DEFAULT,
      },
    );
  }
}

async function channelEnabled() {
  if (Platform.OS !== 'android') return true;

  const value =
    await Notifications.getNotificationChannelAsync(
      CHANNEL,
    );

  return value?.importance !== AndroidImportance.NONE;
}

async function inspect() {
  const [permission, jobs] = await Promise.all([
    Notifications.getPermissionsAsync(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);

  publish({
    ready: true,
    granted:
      granted(permission) &&
      await channelEnabled(),
    scheduled: jobs.some(
      job => job.identifier === DAILY_ID,
    ),
    error: null,
  });
}

async function applyReminder(
  settings: AppSettings,
) {
  if (!settings.remindersEnabled) {
    await Notifications.cancelScheduledNotificationAsync(
      DAILY_ID,
    );

    return;
  }

  const permission =
    await Notifications.getPermissionsAsync();

  if (!granted(permission)) return;

  await channel(settings);

  const jobs =
    await Notifications.getAllScheduledNotificationsAsync();

  const existing = jobs.find(
    job => job.identifier === DAILY_ID,
  );

  if (
    existing?.content.data?.language ===
    settings.language
  ) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: translate(
        settings.language,
        'reminderTitle',
      ),
      body: translate(
        settings.language,
        'reminderBody',
      ),
      data: {
        kind: KIND,
        language: settings.language,
      },
    },
    trigger: {
      type:
        Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
      channelId: CHANNEL,
    },
  });
}

async function askPermission(
  settings: AppSettings,
) {
  if (Platform.OS === 'web') {
    throw new SettingsError('unsupported');
  }

  await channel(settings);

  let permission =
    await Notifications.getPermissionsAsync();

  if (
    !granted(permission) &&
    permission.canAskAgain
  ) {
    permission =
      await Notifications.requestPermissionsAsync();
  }

  if (
    !granted(permission) ||
    !(await channelEnabled())
  ) {
    throw new SettingsError('permissionError');
  }
}

export function refreshNotifications() {
  return serial(async () => {
    if (Platform.OS === 'web') {
      publish({
        ...SERVER,
        ready: true,
      });

      return;
    }

    try {
      const settings = await readSettings();

      await applyReminder(settings);
      await inspect();

      const shown =
        await Notifications.getPresentedNotificationsAsync()
          .catch(() => []);

      for (const notification of shown) {
        await record(notification);
      }
    } catch {
      publish({
        ...status,
        ready: true,
        error: 'nativeError',
      });
    }
  });
}

export function setDailyReminder(
  enabled: boolean,
) {
  return serial(async () => {
    const previous = await readSettings();

    if (Platform.OS === 'web') {
      throw new SettingsError('unsupported');
    }

    try {
      if (enabled) {
        await askPermission(previous);
      }

      await applyReminder({
        ...previous,
        remindersEnabled: enabled,
      });

      await settingsStore.update(settings => ({
        ...settings,
        remindersEnabled: enabled,
      }));

      await inspect();
    } catch (error) {
      try {
        await applyReminder(
          settingsStore.getSnapshot().settings ??
          previous,
        );

        await inspect();
      } catch {
        publish({
          ...status,
          error: 'nativeError',
        });
      }

      throw error instanceof SettingsError
        ? error
        : new SettingsError('nativeError');
    }
  });
}

export function sendTestNotification() {
  return serial(async () => {
    const settings = await readSettings();

    await askPermission(settings);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: translate(
          settings.language,
          'testTitle',
        ),
        body: translate(
          settings.language,
          'testBody',
        ),
        data: {
          kind: KIND,
        },
      },
      trigger: {
        type:
          Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
        channelId: CHANNEL,
      },
    });

    await inspect();
  });
}

async function record(
  notification: Notifications.Notification,
) {
  if (
    notification.request.content.data?.kind !==
    KIND
  ) {
    return;
  }

  const date = Number.isFinite(notification.date)
    ? new Date(notification.date)
    : new Date();

  const settings = await readSettings();

  await addNotice({
    id:
      `${notification.request.identifier}:${notification.date}`,
    title:
      notification.request.content.title ??
      translate(settings.language, 'reminderTitle'),
    body:
      notification.request.content.body ??
      translate(settings.language, 'reminderBody'),
    createdAt: date.toISOString(),
    readAt: null,
  });
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export function listenForNotifications() {
  if (Platform.OS === 'web') {
    return () => {};
  }

  let stopped = false;

  const receive = (
    notification: Notifications.Notification,
  ) => {
    void record(notification).catch(() => {
      publish({
        ...status,
        error: 'saveError',
      });
    });
  };

  const received =
    Notifications.addNotificationReceivedListener(
      receive,
    );

  const response =
    Notifications.addNotificationResponseReceivedListener(
      result => receive(result.notification),
    );

  void Notifications.getLastNotificationResponseAsync()
    .then(result => {
      if (!stopped && result) {
        receive(result.notification);
      }
    })
    .catch(() => {});

  return () => {
    stopped = true;
    received.remove();
    response.remove();
  };
}