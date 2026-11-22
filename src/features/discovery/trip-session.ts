import { findPlaceById } from '@/data/places.local';

import { getTripLocation } from './trip-location';
import { estimateRoute } from './trip-routing';
import { assertCanStart } from './trip-time-policy';

import {
  venueNotice,
  type VenueNotice,
} from './venue-hours';

import {
  recordArrival,
  recordDeparture,
  skipStop,
} from './trip-runtime';

import type {
  LegCheckpoint,
  LegResult,
  TravelMode,
  TripDraft,
} from './trip-model';

import { assertLegResult } from './trip-metrics';
import { tripStore } from './use-trip-draft';

export type PreparedLeg = {
  owner: string | null;
  tripId: string;
  stopId: string;
  placeId: string;
  revision: string;
  mode: 'driving' | 'walking';
  seconds: number;
  preparedAt: number;
  notice: VenueNotice | null;
};

function revision(draft: TripDraft): string {
  return JSON.stringify([
    draft.id,
    draft.startDate,
    draft.dayCount,
    draft.settings,
    draft.stops.map(stop => [
      stop.id,
      stop.placeId,
      stop.dayIndex,
      stop.period,
      stop.order,
      stop.visitMinutes,
      stop.completed,
      stop.progress?.id,
      stop.actual,
    ]),
  ]);
}

function noticeFor(
  draft: TripDraft,
  id: string,
  seconds: number,
  now: number,
) {
  const stop = draft.stops.find(
    item => item.id === id,
  );

  const place = stop && findPlaceById(stop.placeId);

  if (!stop || !place) {
    throw new Error(
      'Điểm này không còn trong danh mục.',
    );
  }

  return venueNotice(
    place.opening_hours_raw,
    now,
    seconds,
    stop.visitMinutes ??
      place.visit_duration_minutes ??
      draft.settings.defaultVisitMinutes,
  );
}

export async function prepareLeg(
  id: string,
  mode: TravelMode,
): Promise<PreparedLeg> {
  if (mode === 'two_wheeler') {
    throw new Error(
      'Chưa hỗ trợ tuyến xe máy. Hãy chọn ô tô hoặc đi bộ.',
    );
  }

  const owner = tripStore.getAccountId();
  const draft = tripStore.getSnapshot().draft;

  const target = draft?.stops.find(
    stop => stop.id === id,
  );

  if (!draft || !target) {
    throw new Error('Điểm này đã bị xóa.');
  }

  assertCanStart(draft, target);

  const place = findPlaceById(target.placeId);

  if (!place?.coordinates_valid) {
    throw new Error(
      'Điểm đến chưa có tọa độ hợp lệ.',
    );
  }

  const location = await getTripLocation();

  const estimate = await estimateRoute(
    location.coords,
    place,
    mode,
  );

  if (tripStore.getAccountId() !== owner) {
    throw new Error('Tài khoản đã thay đổi.');
  }

  const current = tripStore.getSnapshot().draft;

  if (
    !current ||
    revision(current) !== revision(draft)
  ) {
    throw new Error(
      'Lộ trình đã thay đổi. Hãy bấm bắt đầu lại.',
    );
  }

  const preparedAt = Date.now();

  assertCanStart(current, target, preparedAt);

  return {
    owner,
    tripId: draft.id,
    stopId: id,
    placeId: target.placeId,
    mode,
    revision: revision(current),
    seconds: estimate.seconds,
    preparedAt,
    notice: noticeFor(
      current,
      id,
      estimate.seconds,
      preparedAt,
    ),
  };
}

function checkPrepared(
  draft: TripDraft,
  check: PreparedLeg,
) {
  if (
    tripStore.getAccountId() !== check.owner ||
    draft.id !== check.tripId ||
    revision(draft) !== check.revision
  ) {
    throw new Error(
      'Lộ trình hoặc tài khoản đã thay đổi. Hãy bấm bắt đầu lại.',
    );
  }
}

export function startPreparedLeg(
  check: PreparedLeg,
  acceptedClosing = false,
  isCurrent = () => true,
) {
  return tripStore.update(draft => {
    if (!isCurrent()) {
      throw new Error('Đã hủy mở chặng.');
    }

    checkPrepared(draft, check);

    const target = draft.stops.find(
      stop => stop.id === check.stopId,
    );

    if (!target) {
      throw new Error('Điểm này đã bị xóa.');
    }

    const now = Date.now();

    if (
      now - check.preparedAt > 60000 ||
      now < check.preparedAt
    ) {
      throw new Error(
        'Thông tin giờ đóng cửa đã cũ. Hãy bấm bắt đầu lại để kiểm tra.',
      );
    }

    assertCanStart(
      draft,
      target,
      now,
      check.seconds,
    );

    const notice = noticeFor(
      draft,
      target.id,
      check.seconds,
      now,
    );

    if (notice?.kind === 'blocked') {
      throw new Error(notice.message);
    }

    if (
      notice?.kind === 'closing' &&
      (
        !acceptedClosing ||
        check.notice?.kind !== 'closing' ||
        notice.closesAt !== check.notice.closesAt
      )
    ) {
      throw new Error(
        'Cần xác nhận cảnh báo giờ đóng cửa trước khi bắt đầu.',
      );
    }

    if (
      target.progress &&
      target.progress.travelMode !== check.mode
    ) {
      throw new Error(
        'Hãy hủy chặng cũ trước khi đổi phương tiện.',
      );
    }

    const at = new Date(now).toISOString();

    const next = recordDeparture(
      draft,
      target.id,
      at,
    );

    if (target.progress) return next;

    return {
      ...next,
      stops: next.stops.map(stop =>
        stop.id !== target.id
          ? stop
          : {
              ...stop,
              progress: {
                id:
                  `${now}-` +
                  Math.random()
                    .toString(36)
                    .slice(2),
                travelMode: check.mode,
                savedAt: at,
                checkpoint: {
                  startedAt: null,
                  elapsedMs: 0,
                  meters: 0,
                  pairs: 0,
                  partial: false,
                },
              },
            },
      ),
    };
  });
}

export function skipPreparedLeg(
  check: PreparedLeg,
  isCurrent = () => true,
) {
  return tripStore.update(draft => {
    if (!isCurrent()) {
      throw new Error(
        'Đã hủy bỏ qua địa điểm.',
      );
    }

    checkPrepared(draft, check);

    return skipStop(
      draft,
      check.stopId,
      new Date().toISOString(),
    );
  });
}

// Giữ tương thích cho những nơi chưa dùng popup.
export async function beginLeg(
  id: string,
  mode: TravelMode,
) {
  return startPreparedLeg(
    await prepareLeg(id, mode),
  );
}

export function saveLeg(
  id: string,
  sessionId: string,
  checkpoint: LegCheckpoint,
) {
  return tripStore.update(draft => {
    const target = draft.stops.find(
      stop => stop.id === id,
    );

    if (
      !target ||
      target.progress?.id !== sessionId
    ) {
      return draft;
    }

    return {
      ...draft,
      stops: draft.stops.map(stop =>
        stop.id === id
          ? {
              ...stop,
              progress: {
                ...target.progress!,
                savedAt: new Date().toISOString(),
                checkpoint,
              },
            }
          : stop,
      ),
    };
  });
}

export function finishLeg(
  id: string,
  sessionId: string,
  result: LegResult,
) {
  assertLegResult(result);

  return tripStore.update(draft => {
    const target = draft.stops.find(
      stop => stop.id === id,
    );

    if (
      !target ||
      target.progress?.id !== sessionId
    ) {
      throw new Error(
        'Chặng đã thay đổi. Hãy quay lại danh sách.',
      );
    }

    if (
      target.progress.travelMode !==
      result.travelMode
    ) {
      throw new Error(
        'Phương tiện của chặng không khớp.',
      );
    }

    return recordArrival(draft, id, result);
  });
}

export function cancelLeg(id: string) {
  return tripStore.update(draft => ({
    ...draft,
    stops: draft.stops.map(stop => {
      if (stop.id !== id) return stop;

      const next = { ...stop };
      delete next.progress;

      return next;
    }),
  }));
}