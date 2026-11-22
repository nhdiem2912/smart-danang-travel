import {
  findPlaceById,
} from '@/data/places.local';
import {
  useEffect,
  useSyncExternalStore,
} from 'react';
import {
  isValidDate,
  sortedStops,
  type DraftStop,
  type TripDraft,
  type TripSettings,
} from './trip-model';
import { recordManualCheckIn } from './trip-runtime';
import { withoutPendingDay } from './trip-summary-view';

import {
  planSignature,
} from './trip-plan';

import {
  optimizeTrip,
} from './trip-optimizer';

import {
  SERVER_SNAPSHOT,
} from './trip-store-core';

import {
  tripStore,
} from './trip-account-store';

import {
  assertCanAdd,
  assertCanManualCheckIn,
  resetTripDates,
  slotError,
} from './trip-time-policy';

export {
  tripStore
} from './trip-account-store';

type StopInput = Omit<
  DraftStop,
  | 'id'
  | 'order'
  | 'completed'
  | 'result'
  | 'schedule'
  | 'progress'
  | 'previousResults'
> & {
  id?: string;
};

function invalidateSchedules(
  draft: TripDraft,
): TripDraft {
  if (
    draft.plan?.signature ===
    planSignature(draft)
  ) {
    return draft;
  }

  return {
    ...draft,
    plan: undefined,
    stops: draft.stops.map(stop => {
      if (stop.completed) {
        return stop;
      }

      const next = { ...stop };
      delete next.schedule;

      return next;
    }),
  };
}

function requireNoActiveLeg(
  draft: TripDraft,
) {
  if (
    draft.stops.some(
      stop => stop.progress,
    )
  ) {
    throw new Error(
      'Hãy hoàn tất hoặc hủy chặng đang dở ' +
      'trước khi sửa lịch.',
    );
  }
}

export const tripActions = {
  resetDates(
    startDate: string,
    dayCount: number,
  ) {
    return tripStore.update(() =>
      resetTripDates(
        startDate,
        dayCount,
      ),
    );
  },

  add(input: StopInput) {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      const place = findPlaceById(
        input.placeId,
      );

      if (!place) {
        throw new Error(
          'Địa điểm không có trong danh mục.',
        );
      }

      const existing = input.id
        ? draft.stops.find(
            stop =>
              stop.id === input.id,
          )
        : undefined;

      if (input.id && !existing) {
        throw new Error(
          'Điểm này đã bị xóa. ' +
          'Hãy mở lại danh sách.',
        );
      }

      assertCanAdd(
        draft,
        input,
        Date.now(),
        place.visit_duration_minutes,
      );

      const duplicate =
        draft.stops.some(
          stop =>
            stop.id !== input.id &&
            stop.placeId ===
              input.placeId &&
            stop.dayIndex ===
              input.dayIndex,
        );

      if (duplicate) {
        throw new Error(
          'Địa điểm đã có trong ngày này. ' +
          'Hãy sửa điểm hiện có hoặc chọn ngày khác.',
        );
      }

      const sameGroup =
        existing &&
        existing.dayIndex ===
          input.dayIndex &&
        existing.period ===
          input.period;

      const order = sameGroup
        ? existing.order
        : Math.max(
            -1,
            ...draft.stops
              .filter(
                stop =>
                  stop.dayIndex ===
                    input.dayIndex &&
                  stop.period ===
                    input.period,
              )
              .map(
                stop => stop.order,
              ),
          ) + 1;

      const next: DraftStop = {
        ...existing,
        ...input,
        id:
          existing?.id ??
          `${Date.now()}-` +
            Math.random()
              .toString(36)
              .slice(2, 9),
        order,
        completed:
          existing?.completed ?? false,
      };

      return invalidateSchedules({
        ...draft,
        stops: existing
          ? draft.stops.map(
              stop =>
                stop.id === existing.id
                  ? next
                  : stop,
            )
          : [...draft.stops, next],
      });
    });
  },

  remove(id: string) {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      return invalidateSchedules({
        ...draft,
        stops: draft.stops.filter(
          stop => stop.id !== id,
        ),
      });
    });
  },
  removePendingDay(
    dayIndex: number,
    tripId: string,
  ) {
    return tripStore.update(draft =>
      invalidateSchedules(
        withoutPendingDay(
          draft,
          dayIndex,
          tripId,
        ),
      ),
    );
  },
  clear() {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      return {
        ...draft,
        stops: [],
        plan: undefined,
        review: undefined,
      };
    });
  },

  checkIn(id: string) {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      const target = draft.stops.find(
        stop => stop.id === id,
      );

      if (!target || target.completed) {
        throw new Error(
          'Không thay đổi điểm đã hoàn tất.',
        );
      }

      assertCanManualCheckIn(draft, target);

      return recordManualCheckIn(
        draft,
        id,
        new Date().toISOString(),
      );
    });
  },

  move(
    id: string,
    direction: -1 | 1,
  ) {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      const current =
        draft.stops.find(
          stop => stop.id === id,
        );

      if (!current) {
        return draft;
      }

      const timeError = slotError(
        draft,
        current.dayIndex,
        current.period,
      );

      if (timeError) {
        throw new Error(timeError);
      }

      const group = sortedStops(
        draft.stops.filter(
          stop =>
            stop.dayIndex ===
              current.dayIndex &&
            stop.period ===
              current.period,
        ),
      );

      const from = group.findIndex(
        stop => stop.id === id,
      );

      const to = from + direction;

      if (
        to < 0 ||
        to >= group.length
      ) {
        return draft;
      }

      if (
        group[from].completed ||
        group[to].completed
      ) {
        throw new Error(
          'Không thay đổi thứ tự ' +
          'điểm đã hoàn thành.',
        );
      }

      [group[from], group[to]] = [
        group[to],
        group[from],
      ];

      const orders = new Map(
        group.map(
          (stop, index) => [
            stop.id,
            index,
          ],
        ),
      );

      return invalidateSchedules({
        ...draft,
        stops: draft.stops.map(
          stop =>
            orders.has(stop.id)
              ? {
                  ...stop,
                  order:
                    orders.get(
                      stop.id,
                    )!,
                  orderLocked: true,
                }
              : stop,
        ),
      });
    });
  },

  async configure(
    startDate: string,
    dayCount: number,
    settings: TripSettings,
    reorder = false,
  ) {
    await tripStore.load();

    const snapshot =
      tripStore.getSnapshot();

    const previous =
      snapshot.draft;

    if (
      !snapshot.ready ||
      !previous ||
      snapshot.saving
    ) {
      throw new Error(
        'Đợi bản nháp lưu xong ' +
        'rồi thử lại.',
      );
    }

    if (
      previous.startDate !==
        startDate ||
      previous.dayCount !==
        dayCount
    ) {
      throw new Error(
        'Dùng nút Đổi ngày trên lịch. ' +
        'Đổi ngày sẽ reset toàn bộ ' +
        'địa điểm và tiến trình.',
      );
    }

    const changed =
      JSON.stringify(
        previous.settings,
      ) !== JSON.stringify(settings);

    if (changed || reorder) {
      requireNoActiveLeg(previous);
    }

    if (
      !isValidDate(startDate) ||
      !Number.isInteger(dayCount) ||
      dayCount < 1 ||
      dayCount > 14
    ) {
      throw new Error(
        'Nhập ngày YYYY-MM-DD ' +
        'và số ngày từ 1 đến 14.',
      );
    }

    if (
      previous.stops.some(
        stop =>
          stop.dayIndex >= dayCount,
      )
    ) {
      throw new Error(
        'Có địa điểm nằm ngoài ' +
        'số ngày của chuyến đi.',
      );
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        settings.startTime,
      ) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        settings.endTime,
      ) ||
      settings.endTime <=
        settings.startTime ||
      !Number.isInteger(
        settings.defaultVisitMinutes,
      ) ||
      settings.defaultVisitMinutes < 1 ||
      settings.defaultVisitMinutes > 720
    ) {
      throw new Error(
        'Kiểm tra giờ bắt đầu/kết thúc ' +
        'và thời gian dừng.',
      );
    }

    let next: TripDraft = {
      ...previous,
      startDate,
      dayCount,
      settings: {
        ...settings,
      },
    };

    if (changed) {
      next = invalidateSchedules(next);
    }

    if (reorder) {
      next = await optimizeTrip(next);
    }

    return tripStore.update(current => {
      if (
        JSON.stringify(current) !==
        JSON.stringify(previous)
      ) {
        throw new Error(
          'Lịch đã thay đổi trong lúc tính. ' +
          'Hãy thử tối ưu lại.',
        );
      }

      return next;
    });
  },
};

const getServerSnapshot = () =>
  SERVER_SNAPSHOT;

export function useTripDraft() {
  const snapshot =
    useSyncExternalStore(
      tripStore.subscribe,
      tripStore.getSnapshot,
      getServerSnapshot,
    );

  useEffect(() => {
    void tripStore.load();
  }, []);

  return snapshot;
}