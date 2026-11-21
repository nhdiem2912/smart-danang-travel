import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    createTripStore,
    SERVER_SNAPSHOT,
} from './trip-store-core';

import type {
    TripDraft,
} from './trip-model';

let store:
  ReturnType<typeof createTripStore> | null =
    null;

let uid: string | null = null;
let generation = 0;
let release: (() => void) | null = null;

let snapshot = SERVER_SNAPSHOT;

const listeners = new Set<() => void>();

let activation: Promise<void> =
  Promise.resolve();

function emit() {
  listeners.forEach(
    listener => listener(),
  );
}

export function activateTripAccount(
  nextUid: string | null,
): Promise<void> {
  if (nextUid === uid && store) {
    return activation;
  }

  const token = ++generation;
  const old = store;

  release?.();
  release = null;

  store = null;
  uid = null;

  snapshot = SERVER_SNAPSHOT;
  emit();

  activation = (async () => {
    await old?.flush();

    if (
      token !== generation ||
      !nextUid
    ) {
      return;
    }

    const next = createTripStore(
      AsyncStorage,
      `@smart-danang-travel/trip-draft:v2:${nextUid}`,
    );

    await next.load();

    if (token !== generation) {
      return;
    }

    store = next;
    uid = nextUid;
    snapshot = next.getSnapshot();

    emit();

    release = next.subscribe(() => {
      if (token === generation) {
        snapshot = next.getSnapshot();
        emit();
      }
    });
  })();

  return activation;
}

export const tripStore = {
  getSnapshot: () => snapshot,

  getAccountId: () => uid,

  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  async load() {
    await activation;
    await store?.load();
  },

  update(
    transform: (
      draft: TripDraft,
    ) => TripDraft | Promise<TripDraft>,
  ) {
    const target = store;

    if (!target || !uid) {
      return Promise.reject(
        new Error(
          'Chưa tải dữ liệu chuyến đi của tài khoản.',
        ),
      );
    }

    return target.update(transform);
  },
};