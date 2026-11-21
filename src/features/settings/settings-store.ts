import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

export type Language = 'vi' | 'en' | 'ko' | 'ja' | 'zh';
export type Currency = 'VND' | 'USD' | 'EUR' | 'KRW' | 'JPY';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Avatar =
  | { kind: 'file'; name: string }
  | { kind: 'data'; uri: string }
  | null;

export type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type AppSettings = {
  version: 1;
  theme: ThemeMode;
  language: Language;
  currency: Currency;
  profile: {
    name: string;
    avatar: Avatar;
  };
  remindersEnabled: boolean;
  inbox: Notice[];
  updatedAt: string;
};

export type ErrorCode =
  | 'loadError'
  | 'saveError'
  | 'permissionError'
  | 'photoError'
  | 'nativeError'
  | 'unsupported';

export class SettingsError extends Error {
  constructor(public code: ErrorCode) {
    super(code);
  }
}

const KEY = '@smart-danang-travel/settings:v1';

export const LANGUAGES: readonly Language[] = [
  'vi', 'en', 'ko', 'ja', 'zh',
];

export const CURRENCIES: readonly Currency[] = [
  'VND', 'USD', 'EUR', 'KRW', 'JPY',
];

export const LANGUAGE_LABELS: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
};

export function emptySettings(): AppSettings {
  return {
    version: 1,
    theme: 'system',
    language: 'vi',
    currency: 'VND',
    profile: {
      name: '',
      avatar: null,
    },
    remindersEnabled: false,
    inbox: [],
    updatedAt: new Date().toISOString(),
  };
}

export function validateSettings(
  value: unknown,
): asserts value is AppSettings {
  const s = value as AppSettings | null;

  const date = (v: unknown) =>
    typeof v === 'string' &&
    Number.isFinite(Date.parse(v));

  if (
    !s ||
    s.version !== 1 ||
    !['system', 'light', 'dark'].includes(s.theme) ||
    !LANGUAGES.includes(s.language) ||
    !CURRENCIES.includes(s.currency) ||
    !s.profile ||
    typeof s.profile.name !== 'string' ||
    s.profile.name.length > 60 ||
    typeof s.remindersEnabled !== 'boolean' ||
    !date(s.updatedAt) ||
    !Array.isArray(s.inbox)
  ) {
    throw new SettingsError('saveError');
  }

  const avatar = s.profile.avatar;

  if (
    avatar !== null &&
    (
      !avatar ||
      (
        avatar.kind === 'file'
          ? !/^avatar-[\da-z-]+\.(jpg|png|webp)$/.test(avatar.name)
          : avatar.kind === 'data'
            ? typeof avatar.uri !== 'string' ||
              avatar.uri.length > 1000000 ||
              !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(
                avatar.uri,
              )
            : true
      )
    )
  ) {
    throw new SettingsError('saveError');
  }

  const ids = new Set<string>();

  for (const notice of s.inbox) {
    if (
      !notice ||
      typeof notice.id !== 'string' ||
      !notice.id ||
      ids.has(notice.id) ||
      typeof notice.title !== 'string' ||
      typeof notice.body !== 'string' ||
      !date(notice.createdAt) ||
      !(
        notice.readAt === null ||
        date(notice.readAt)
      )
    ) {
      throw new SettingsError('saveError');
    }

    ids.add(notice.id);
  }
}

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (
    key: string,
    value: string,
  ) => Promise<unknown>;
};

type Snapshot = {
  settings: AppSettings | null;
  ready: boolean;
  saving: boolean;
  error: ErrorCode | null;
};

const SERVER: Snapshot = {
  settings: null,
  ready: false,
  saving: false,
  error: null,
};

export function createSettingsStore(storage: Storage) {
  let snapshot = SERVER;
  let loading: Promise<void> | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const listeners = new Set<() => void>();

  const emit = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };

  function load(): Promise<void> {
    if (snapshot.ready) return Promise.resolve();
    if (loading) return loading;

    loading = (async () => {
      try {
        const raw = await storage.getItem(KEY);

        const value: unknown =
          raw === null
            ? emptySettings()
            : JSON.parse(raw);

        validateSettings(value);

        emit({
          settings: value,
          ready: true,
          saving: false,
          error: null,
        });
      } catch {
        emit({
          settings: null,
          ready: false,
          saving: false,
          error: 'loadError',
        });
      }
    })().finally(() => {
      loading = null;
    });

    return loading;
  }

  async function update(
    transform: (value: AppSettings) => AppSettings,
  ) {
    await load();

    const operation = queue.then(async () => {
      const previous = snapshot.settings;

      if (!snapshot.ready || !previous) {
        throw new SettingsError('loadError');
      }

      try {
        const copy = JSON.parse(
          JSON.stringify(previous),
        ) as AppSettings;

        const next = {
          ...transform(copy),
          updatedAt: new Date().toISOString(),
        };

        validateSettings(next);

        emit({
          settings: previous,
          ready: true,
          saving: true,
          error: null,
        });

        await storage.setItem(
          KEY,
          JSON.stringify(next),
        );

        emit({
          settings: next,
          ready: true,
          saving: false,
          error: null,
        });

        return next;
      } catch (error) {
        const code =
          error instanceof SettingsError
            ? error.code
            : 'saveError';

        emit({
          settings: previous,
          ready: true,
          saving: false,
          error: code,
        });

        throw new SettingsError(code);
      }
    });

    queue = operation.catch(() => {});

    return operation;
  }

  return {
    load,
    update,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const settingsStore =
  createSettingsStore(AsyncStorage);

export function useAppSettings() {
  const snapshot = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    () => SERVER,
  );

  useEffect(() => {
    void settingsStore.load();
  }, []);

  return snapshot;
}

export function addNotice(notice: Notice) {
  return settingsStore.update(settings =>
    settings.inbox.some(item => item.id === notice.id)
      ? settings
      : {
          ...settings,
          inbox: [notice, ...settings.inbox],
        },
  );
}