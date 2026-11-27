import {
  assertLegResult,
} from './trip-metrics';

import {
  DUPLICATE_STOP_MESSAGE,
  emptyDraft,
  isValidDate,
  PERIODS,
  stopSelectionKey,
  type TripDraft,
} from './trip-model';

import {
  validatePlan,
} from './trip-plan';

import {
  validateStopExtras,
} from './trip-validation';

export const STORAGE_KEY =
  '@smart-danang-travel/trip-draft:v1';

type DraftStorage = {
  getItem: (
    key: string,
  ) => Promise<string | null>;

  setItem: (
    key: string,
    value: string,
  ) => Promise<unknown>;
};

export type DraftSnapshot = {
  draft: TripDraft | null;
  ready: boolean;
  saving: boolean;
  error: string | null;
};

export const SERVER_SNAPSHOT: DraftSnapshot = {
  draft: null,
  ready: false,
  saving: false,
  error: null,
};

export function validateDraft(
  value: unknown,
): asserts value is TripDraft {
  if (!value || typeof value !== 'object') {
    throw new Error('Bản nháp không hợp lệ.');
  }

  const draft = value as TripDraft;

  if (
    draft.version !== 1 ||
    typeof draft.id !== 'string' ||
    typeof draft.startDate !== 'string' ||
    !isValidDate(draft.startDate) ||
    !Number.isInteger(draft.dayCount) ||
    draft.dayCount < 1 ||
    draft.dayCount > 14 ||
    !Array.isArray(draft.stops) ||
    typeof draft.updatedAt !== 'string'
  ) {
    throw new Error(
      'Kiểm tra ngày bắt đầu và số ngày đi từ 1 đến 14.',
    );
  }

  if (
    draft.tripActive !== undefined &&
    typeof draft.tripActive !== 'boolean'
  ) {
    throw new Error(
      'Trạng thái chuyến không hợp lệ.',
    );
  }

  if (draft.review !== undefined) {
    const review = draft.review;

    if (
      !review ||
      !Number.isInteger(review.rating) ||
      review.rating < 1 ||
      review.rating > 5 ||
      typeof review.note !== 'string' ||
      review.note.length > 1000 ||
      typeof review.submittedAt !== 'string' ||
      !Number.isFinite(
        Date.parse(review.submittedAt),
      )
    ) {
      throw new Error(
        'Đánh giá chuyến đi không hợp lệ.',
      );
    }
  }

  const settings = draft.settings;

  const validTime = (time: unknown) =>
    typeof time === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  if (
    !settings ||
    typeof settings.startLabel !== 'string' ||
    !settings.startLabel.trim() ||
    !validTime(settings.startTime) ||
    !validTime(settings.endTime) ||
    settings.endTime <= settings.startTime ||
    ![
      'two_wheeler',
      'driving',
      'walking',
    ].includes(settings.travelMode) ||
    !Number.isInteger(
      settings.defaultVisitMinutes,
    ) ||
    settings.defaultVisitMinutes < 1 ||
    settings.defaultVisitMinutes > 720
  ) {
    throw new Error(
      'Kiểm tra cấu hình chuyến đi. ' +
      'Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.',
    );
  }

  if (
    (settings.latitude === null) !==
      (settings.longitude === null) ||
    (
      settings.latitude !== null &&
      (
        !Number.isFinite(settings.latitude) ||
        Math.abs(settings.latitude) > 90 ||
        !Number.isFinite(settings.longitude) ||
        Math.abs(settings.longitude!) > 180
      )
    )
  ) {
    throw new Error(
      'Tọa độ xuất phát không hợp lệ.',
    );
  }

  if (
    draft.stops.filter(
      stop => stop?.progress,
    ).length > 1
  ) {
    throw new Error(
      'Chỉ có thể có một chặng đang dở.',
    );
  }

  const ids = new Set<string>();
  const selections = new Set<string>();

  for (const stop of draft.stops) {
    if (
      !stop ||
      typeof stop.id !== 'string' ||
      !stop.id ||
      typeof stop.placeId !== 'string' ||
      !stop.placeId ||
      !Number.isInteger(stop.dayIndex) ||
      stop.dayIndex < 0 ||
      stop.dayIndex >= draft.dayCount ||
      !PERIODS.some(
        period => period.id === stop.period,
      ) ||
      typeof stop.note !== 'string' ||
      stop.note.length > 1000 ||
      !Number.isInteger(stop.order) ||
      stop.order < 0 ||
      typeof stop.completed !== 'boolean' ||
      (
        stop.visitMinutes !== null &&
        (
          !Number.isInteger(stop.visitMinutes) ||
          stop.visitMinutes < 1 ||
          stop.visitMinutes > 720
        )
      )
    ) {
      throw new Error(
        'Điểm đã chọn không hợp lệ. ' +
        'Nếu giảm số ngày, hãy chuyển hoặc xóa ' +
        'điểm ở ngày bị bỏ trước.',
      );
    }

    if (stop.result !== undefined) {
      assertLegResult(stop.result);
    }

    validateStopExtras(stop);

    const selection = stopSelectionKey(stop);

    if (ids.has(stop.id)) {
      throw new Error('Mã lượt ghé bị trùng.');
    }

    if (selections.has(selection)) {
      throw new Error(DUPLICATE_STOP_MESSAGE);
    }

    ids.add(stop.id);
    selections.add(selection);
  }

  validatePlan(draft);
}

export function createTripStore(
  storage: DraftStorage,
  storageKey = STORAGE_KEY,
) {
  let snapshot: DraftSnapshot =
    SERVER_SNAPSHOT;

  let loading: Promise<void> | null = null;

  let queue: Promise<unknown> =
    Promise.resolve();

  const listeners = new Set<() => void>();

  function emit(next: DraftSnapshot) {
    snapshot = next;

    listeners.forEach(
      listener => listener(),
    );
  }

  function load(): Promise<void> {
    if (snapshot.ready) {
      return Promise.resolve();
    }

    if (loading) return loading;

    loading = Promise.resolve()
      .then(async () => {
        try {
          const raw = await storage.getItem(
            storageKey,
          );

          const draft: unknown =
            raw === null
              ? emptyDraft()
              : JSON.parse(raw);

          validateDraft(draft);

          emit({
            draft,
            ready: true,
            saving: false,
            error: null,
          });
        } catch {
          emit({
            draft: null,
            ready: false,
            saving: false,
            error:
              'Không đọc được bản nháp. ' +
              'Dữ liệu cũ được giữ nguyên; hãy thử lại.',
          });
        }
      })
      .finally(() => {
        loading = null;
      });

    return loading;
  }

  async function update(
    transform: (
      draft: TripDraft,
    ) => TripDraft | Promise<TripDraft>,
  ) {
    await load();

    const operation = queue.then(
      async () => {
        if (
          !snapshot.ready ||
          !snapshot.draft
        ) {
          throw new Error(
            'Chưa đọc được bản nháp, ' +
            'không thể ghi đè dữ liệu cũ.',
          );
        }

        const previous = snapshot.draft;

        try {
          const editable = JSON.parse(
            JSON.stringify(previous),
          ) as TripDraft;

          const transformed =
            await transform(editable);

          const next = {
            ...transformed,
            updatedAt:
              new Date().toISOString(),
          };

          validateDraft(next);

          emit({
            draft: previous,
            ready: true,
            saving: true,
            error: null,
          });

          await storage.setItem(
            storageKey,
            JSON.stringify(next),
          );

          emit({
            draft: next,
            ready: true,
            saving: false,
            error: null,
          });

          return next;
        } catch (error) {
          const message =
            error instanceof Error &&
            error.message
              ? error.message
              : 'Không lưu được bản nháp. Hãy thử lại.';

          emit({
            draft: previous,
            ready: true,
            saving: false,
            error: message,
          });

          throw new Error(message);
        }
      },
    );

    queue = operation.catch(() => {});

    return operation;
  }

  return {
    load,
    update,

    flush: () => queue,

    getSnapshot: () => snapshot,

    subscribe: (
      listener: () => void,
    ) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}