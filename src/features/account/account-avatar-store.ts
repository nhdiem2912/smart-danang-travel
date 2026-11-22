import AsyncStorage from '@react-native-async-storage/async-storage';

export type AvatarSnapshot = {
  uri: string | null;
  ready: boolean;
  error: string | null;
};

const EMPTY: AvatarSnapshot = {
  uri: null,
  ready: false,
  error: null,
};

const SIGNED_OUT: AvatarSnapshot = {
  uri: null,
  ready: true,
  error: null,
};

const states =
  new Map<string, AvatarSnapshot>();

const versions = new Map<string, number>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

const key = (uid: string) =>
  `@smart-danang-travel/avatar:v1:${uid}`;

export function avatarSnapshot(
  uid: string | null,
): AvatarSnapshot {
  return uid
    ? states.get(uid) ?? EMPTY
    : SIGNED_OUT;
}

export function subscribeAvatar(
  listener: () => void,
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function publish(
  uid: string,
  next: AvatarSnapshot,
) {
  states.set(uid, next);

  listeners.forEach(
    listener => listener(),
  );
}

export function loadAccountAvatar(
  uid: string,
): Promise<void> {
  if (states.get(uid)?.ready) {
    return Promise.resolve();
  }

  const existing = pending.get(uid);

  if (existing) return existing;

  const version = versions.get(uid) ?? 0;

  const request = (async () => {
    try {
      const uri =
        await AsyncStorage.getItem(key(uid));

      if (
        (versions.get(uid) ?? 0) === version
      ) {
        publish(uid, {
          uri,
          ready: true,
          error: null,
        });
      }
    } catch {
      if (
        (versions.get(uid) ?? 0) === version
      ) {
        publish(uid, {
          uri: null,
          ready: true,
          error:
            'Chưa đọc được ảnh đã lưu. Bạn có thể chọn lại ảnh.',
        });
      }
    }
  })();

  pending.set(uid, request);

  void request.finally(() => {
    pending.delete(uid);
  });

  return request;
}

export async function saveAccountAvatar(
  uid: string,
  uri: string,
) {
  await AsyncStorage.setItem(
    key(uid),
    uri,
  );

  versions.set(
    uid,
    (versions.get(uid) ?? 0) + 1,
  );

  publish(uid, {
    uri,
    ready: true,
    error: null,
  });
}