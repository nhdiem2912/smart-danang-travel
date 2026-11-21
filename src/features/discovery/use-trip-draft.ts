import { findPlaceById } from '@/data/places.local';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import {
    isValidDate,
    sortedStops,
    type DraftStop,
    type TripDraft,
    type TripSettings,
} from './trip-model';
import { planSignature } from './trip-plan';

import { optimizeTrip } from './trip-optimizer';

import {
    createTripStore,
    SERVER_SNAPSHOT,
} from './trip-store-core';

export const tripStore = createTripStore(AsyncStorage);

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

function invalidateSchedules(draft: TripDraft): TripDraft {
  if (draft.plan?.signature === planSignature(draft)) {
    return draft;
  }

  return {
    ...draft,
    plan: undefined,
    stops: draft.stops.map(stop => {
      if (stop.completed) return stop;

      const next = { ...stop };
      delete next.schedule;

      return next;
    }),
  };
}

function requireNoActiveLeg(draft: TripDraft) {
  if (draft.stops.some(stop => stop.progress)) {
    throw new Error(
      'Hãy hoàn tất hoặc hủy chặng đang dở trước khi sửa lịch.',
    );
  }
}

export const tripActions = {
  add(input: StopInput) {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      if (!findPlaceById(input.placeId)) {
        throw new Error('Địa điểm không có trong danh mục.');
      }

      const existing = input.id
        ? draft.stops.find(stop => stop.id === input.id)
        : undefined;

      if (input.id && !existing) {
        throw new Error(
          'Điểm này đã bị xóa. Hãy mở lại danh sách.',
        );
      }

      const duplicate = draft.stops.some(
        stop =>
          stop.id !== input.id &&
          stop.placeId === input.placeId &&
          stop.dayIndex === input.dayIndex,
      );

      if (duplicate) {
        throw new Error(
          'Địa điểm đã có trong ngày này. Hãy sửa điểm hiện có hoặc chọn ngày khác.',
        );
      }

      const sameGroup =
        existing &&
        existing.dayIndex === input.dayIndex &&
        existing.period === input.period;

      const order = sameGroup
        ? existing.order
        : Math.max(
            -1,
            ...draft.stops
              .filter(
                stop =>
                  stop.dayIndex === input.dayIndex &&
                  stop.period === input.period,
              )
              .map(stop => stop.order),
          ) + 1;

      const next: DraftStop = {
        ...existing,
        ...input,
        id:
          existing?.id ??
          `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        order,
        completed: existing?.completed ?? false,
      };

      return invalidateSchedules({
        ...draft,
        stops: existing
          ? draft.stops.map(stop =>
              stop.id === existing.id ? next : stop,
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
        stops: draft.stops.filter(stop => stop.id !== id),
      });
    });
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

      return {
        ...draft,
        review: undefined,
        stops: draft.stops.map(stop =>
          stop.id === id
            ? { ...stop, completed: !stop.completed }
            : stop,
        ),
      };
    });
  },

  move(id: string, direction: -1 | 1) {
    return tripStore.update(draft => {
      requireNoActiveLeg(draft);

      const current = draft.stops.find(
        stop => stop.id === id,
      );

      if (!current) return draft;

      const group = sortedStops(
        draft.stops.filter(
          stop =>
            stop.dayIndex === current.dayIndex &&
            stop.period === current.period,
        ),
      );

      const from = group.findIndex(stop => stop.id === id);
      const to = from + direction;

      if (to < 0 || to >= group.length) return draft;

      if (group[from].completed || group[to].completed) {
        throw new Error(
          'Không thay đổi thứ tự điểm đã hoàn thành.',
        );
      }

      [group[from], group[to]] = [group[to], group[from]];

      const orders = new Map(
        group.map((stop, index) => [stop.id, index]),
      );

      return invalidateSchedules({
        ...draft,
        stops: draft.stops.map(stop =>
          orders.has(stop.id)
            ? {
                ...stop,
                order: orders.get(stop.id)!,
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

    const snapshot = tripStore.getSnapshot();
    const previous = snapshot.draft;

    if (!snapshot.ready || !previous || snapshot.saving) {
      throw new Error(
        'Đợi bản nháp lưu xong rồi thử lại.',
      );
    }

    const changed =
      previous.startDate !== startDate ||
      previous.dayCount !== dayCount ||
      JSON.stringify(previous.settings) !==
        JSON.stringify(settings);

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
        'Nhập ngày YYYY-MM-DD và số ngày từ 1 đến 14.',
      );
    }

    if (
      previous.stops.some(stop => stop.dayIndex >= dayCount)
    ) {
      throw new Error(
        'Hãy chuyển điểm khỏi các ngày bị bỏ trước khi giảm số ngày.',
      );
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.endTime) ||
      settings.endTime <= settings.startTime ||
      !Number.isInteger(settings.defaultVisitMinutes) ||
      settings.defaultVisitMinutes < 1 ||
      settings.defaultVisitMinutes > 720
    ) {
      throw new Error(
        'Kiểm tra giờ bắt đầu/kết thúc và thời gian dừng.',
      );
    }

    let next: TripDraft = {
      ...previous,
      startDate,
      dayCount,
      settings: { ...settings },
    };

    if (changed) {
      next = invalidateSchedules(next);
    }

    if (reorder) {
      next = await optimizeTrip(next);
    }

    return tripStore.update(current => {
      if (
        JSON.stringify(current) !== JSON.stringify(previous)
      ) {
        throw new Error(
          'Lịch đã thay đổi trong lúc tính. Hãy thử tối ưu lại.',
        );
      }

      return next;
    });
  },
};

const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useTripDraft() {
  const snapshot = useSyncExternalStore(
    tripStore.subscribe,
    tripStore.getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    void tripStore.load();
  }, []);

  return snapshot;
}