import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    archiveTrip,
    getArchivedTrip,
} from './trip-history-api';

import {
    tripStore,
} from './trip-account-store';

import {
    STORAGE_KEY,
    validateDraft,
} from './trip-store-core';

import {
    emptyDraft,
} from './trip-model';

import {
    vietnamClock,
} from './trip-time-policy';

function blank() {
  return {
    ...emptyDraft(),
    startDate: vietnamClock().date,
  };
}

export async function finishTrip(
  rating: number,
  note: string,
) {
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    note.trim().length > 1000
  ) {
    throw new Error(
      'Chọn 1–5 sao và ghi chú ' +
      'tối đa 1000 ký tự.',
    );
  }

  const uid =
    tripStore.getAccountId();

  if (!uid) {
    throw new Error(
      'Hãy đăng nhập để lưu lịch sử.',
    );
  }

  // Giữ đánh giá trên thiết bị trước.
  // Thử lại sẽ dùng cùng mã chuyến và thời điểm gửi.
  await tripStore.update(draft => {
    if (
      !draft.stops.length ||
      draft.stops.some(
        stop =>
          !stop.completed ||
          stop.progress,
      )
    ) {
      throw new Error(
        'Hãy hoàn tất mọi địa điểm ' +
        'trước khi kết thúc.',
      );
    }

    const sameReview =
      draft.review?.rating === rating &&
      draft.review.note === note.trim();

    return {
      ...draft,
      review: sameReview
        ? draft.review
        : {
            rating,
            note: note.trim(),
            submittedAt:
              new Date().toISOString(),
          },
    };
  });

  if (
    uid !== tripStore.getAccountId()
  ) {
    throw new Error(
      'Tài khoản đã thay đổi.',
    );
  }

  return tripStore.update(
    async draft => {
      await archiveTrip(uid, draft);

      // Chỉ reset sau khi máy chủ xác nhận lưu.
      return blank();
    },
  );
}

export async function recoverArchivedTrip() {
  const uid =
    tripStore.getAccountId();

  const current =
    tripStore.getSnapshot().draft;

  if (
    !uid ||
    !current?.review ||
    current.stops.some(
      stop => !stop.completed,
    )
  ) {
    return;
  }

  const archived =
    await getArchivedTrip(
      uid,
      current.id,
    );

  if (
    !archived ||
    uid !== tripStore.getAccountId()
  ) {
    return;
  }

  if (
    JSON.stringify(
      archived.trip.stops,
    ) !== JSON.stringify(current.stops)
  ) {
    return;
  }

  await tripStore.update(draft => {
    const sameTrip =
      draft.id === current.id &&
      JSON.stringify(draft.stops) ===
        JSON.stringify(current.stops);

    return sameTrip
      ? blank()
      : draft;
  });
}

const LEGACY_CLAIM =
  '@smart-danang-travel/legacy-trip-claimed:v1';

export async function hasLegacyTrip() {
  const claimed =
    await AsyncStorage.getItem(
      LEGACY_CLAIM,
    );

  if (claimed) return false;

  const raw =
    await AsyncStorage.getItem(
      STORAGE_KEY,
    );

  if (!raw) return false;

  try {
    const draft: unknown =
      JSON.parse(raw);

    validateDraft(draft);

    return draft.stops.length > 0;
  } catch {
    return false;
  }
}

export async function importLegacyTrip() {
  const uid =
    tripStore.getAccountId();

  if (!uid) {
    throw new Error(
      'Hãy đăng nhập trước.',
    );
  }

  const claimed =
    await AsyncStorage.getItem(
      LEGACY_CLAIM,
    );

  if (claimed) {
    throw new Error(
      'Bản nháp cũ đã được nhận ' +
      'vào một tài khoản.',
    );
  }

  const raw =
    await AsyncStorage.getItem(
      STORAGE_KEY,
    );

  if (!raw) {
    throw new Error(
      'Không có chuyến cũ trên thiết bị.',
    );
  }

  const legacy: unknown =
    JSON.parse(raw);

  validateDraft(legacy);

  const next = await tripStore.update(
    current => {
      if (
        current.stops.length ||
        current.tripActive
      ) {
        throw new Error(
          'Tài khoản đã có chuyến. ' +
          'Không ghi đè dữ liệu.',
        );
      }

      return {
        ...legacy,
        id: emptyDraft().id,
        tripActive: true,
      };
    },
  );

  // Giữ nguyên bản gốc, nhưng không cho nhận lặp lại.
  await AsyncStorage.setItem(
    LEGACY_CLAIM,
    uid,
  );

  return next;
}