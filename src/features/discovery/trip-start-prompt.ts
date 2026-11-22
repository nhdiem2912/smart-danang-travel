import { Alert } from 'react-native';

import type {
    TravelMode,
    TripDraft,
} from './trip-model';

import {
    prepareLeg,
    skipPreparedLeg,
    startPreparedLeg,
    type PreparedLeg,
} from './trip-session';

import { tripStore } from './trip-account-store';
import { nextPendingStop } from './trip-runtime';
import { assertCanStart } from './trip-time-policy';

type Choice = 'go' | 'skip' | 'cancel';

function ask(check: PreparedLeg): Promise<Choice> {
  if (!check.notice) {
    return Promise.resolve('go');
  }

  return new Promise(resolve => {
    Alert.alert(
      check.notice!.kind === 'closing'
        ? 'Lưu ý giờ đóng cửa'
        : 'Chưa thể đi địa điểm này',
      check.notice!.message,
      [
        {
          text: 'Quay lại',
          style: 'cancel',
          onPress: () => resolve('cancel'),
        },
        {
          text: 'Bỏ qua địa điểm',
          style: 'destructive',
          onPress: () => resolve('skip'),
        },
        ...(
          check.notice!.kind === 'closing'
            ? [
                {
                  text: 'Vẫn đi',
                  onPress: () => resolve('go'),
                },
              ]
            : []
        ),
      ],
      {
        cancelable: true,
        onDismiss: () => resolve('cancel'),
      },
    );
  });
}

const busy = new Set<string>();

export async function requestLegStart(
  id: string,
  mode: TravelMode,
  isCurrent = () => true,
): Promise<TripDraft | null> {
  const owner = tripStore.getAccountId();
  const key = owner || 'guest';

  if (busy.has(key)) {
    throw new Error(
      'Đang kiểm tra chặng. Hãy đợi một chút.',
    );
  }

  busy.add(key);

  try {
    let targetId = id;

    while (
      isCurrent() &&
      owner === tripStore.getAccountId()
    ) {
      const check = await prepareLeg(
        targetId,
        mode,
      );

      if (
        !isCurrent() ||
        owner !== tripStore.getAccountId()
      ) {
        return null;
      }

      const choice = await ask(check);

      if (
        !isCurrent() ||
        owner !== tripStore.getAccountId()
      ) {
        return null;
      }

      if (choice === 'cancel') {
        return null;
      }

      if (choice === 'go') {
        return await startPreparedLeg(
          check,
          check.notice?.kind === 'closing',
          isCurrent,
        );
      }

      const next = await skipPreparedLeg(
        check,
        isCurrent,
      );

      const stop = nextPendingStop(next);

      if (!stop) return null;

      try {
        assertCanStart(next, stop);
      } catch {
        return null;
      }

      targetId = stop.id;
    }

    return null;
  } catch (error) {
    if (
      !isCurrent() ||
      owner !== tripStore.getAccountId()
    ) {
      return null;
    }

    throw error;
  } finally {
    busy.delete(key);
  }
}