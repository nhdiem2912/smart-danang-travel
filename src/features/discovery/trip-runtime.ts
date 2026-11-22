import { assertLegResult } from './trip-metrics';

import {
    sortedStops,
    type DraftStop,
    type LegResult,
    type TripDraft,
} from './trip-model';

function instant(value: string): number {
  const number = Date.parse(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      'Thời gian thực tế không hợp lệ.',
    );
  }

  return number;
}

export function nextPendingStop(
  draft: TripDraft,
): DraftStop | undefined {
  return sortedStops(draft.stops).find(
    stop => !stop.completed,
  );
}

function pending(
  draft: TripDraft,
  id: string,
): DraftStop {
  const target = draft.stops.find(
    stop => stop.id === id,
  );

  if (!target || target.completed) {
    throw new Error(
      'Địa điểm không còn chờ thực hiện.',
    );
  }

  return target;
}

export function clearTimeline(
  draft: TripDraft,
): TripDraft {
  return {
    ...draft,
    plan: undefined,
    review: undefined,
    stops: draft.stops.map(stop => {
      const next = { ...stop };
      delete next.schedule;
      return next;
    }),
  };
}

function closeVisits(
  draft: TripDraft,
  at: string,
): TripDraft {
  const end = instant(at);

  const previous = sortedStops(draft.stops)
    .filter(stop => stop.completed)
    .at(-1);

  const arrivedAt =
    previous?.actual?.arrivedAt ??
    previous?.result?.arrivedAt;

  if (
    !previous ||
    !arrivedAt ||
    previous.actual?.leftAt
  ) {
    return draft;
  }

  if (end < instant(arrivedAt)) {
    throw new Error(
      'Giờ rời địa điểm không thể trước giờ đến. Kiểm tra đồng hồ thiết bị.',
    );
  }

  return {
    ...draft,
    stops: draft.stops.map(stop =>
      stop.id === previous.id
        ? {
            ...stop,
            actual: {
              ...stop.actual,
              arrivedAt,
              leftAt: at,
            },
          }
        : stop,
    ),
  };
}

export function recordDeparture(
  draft: TripDraft,
  id: string,
  at: string,
): TripDraft {
  instant(at);

  const target = pending(draft, id);

  const active = draft.stops.find(
    stop => stop.progress,
  );

  if (active && active.id !== id) {
    throw new Error(
      'Hãy hoàn tất hoặc hủy chặng đang dở trước.',
    );
  }

  if (nextPendingStop(draft)?.id !== id) {
    throw new Error(
      'Hãy đi theo thứ tự lộ trình.',
    );
  }

  if (
    target.progress &&
    target.actual?.startedAt
  ) {
    return draft;
  }

  const startedAt =
    target.progress?.checkpoint.startedAt ?? at;

  const next = clearTimeline(
    closeVisits(draft, startedAt),
  );

  return {
    ...next,
    stops: next.stops.map(stop =>
      stop.id === id
        ? {
            ...stop,
           actual: {
  startedAt,
},
          }
        : stop,
    ),
  };
}

export function recordArrival(
  draft: TripDraft,
  id: string,
  result: LegResult,
): TripDraft {
  assertLegResult(result);

  const target = pending(draft, id);

  const startedAt =
    target.actual?.startedAt ??
    result.startedAt;

  if (
    instant(result.arrivedAt) <
    instant(startedAt)
  ) {
    throw new Error(
      'Giờ đến không thể trước giờ bắt đầu.',
    );
  }

  const next = clearTimeline(draft);

  return {
    ...next,
    stops: next.stops.map(stop => {
      if (stop.id !== id) return stop;

      const value = {
        ...stop,
        completed: true,
        result,
        actual: {
          ...stop.actual,
          startedAt,
          arrivedAt: result.arrivedAt,
          checkInMethod: 'navigation' as const,
        },
      };

      delete value.progress;

      return value;
    }),
  };
}

export function recordManualCheckIn(
  draft: TripDraft,
  id: string,
  at: string,
): TripDraft {
  instant(at);
  pending(draft, id);

  if (draft.stops.some(stop => stop.progress)) {
    throw new Error(
      'Hãy hoàn tất hoặc hủy chặng đang dở trước.',
    );
  }

  const next = clearTimeline(draft);

  return {
    ...next,
    stops: next.stops.map(stop =>
      stop.id === id
        ? {
            ...stop,
            completed: true,
            actual: {
              ...stop.actual,
              manualRecordedAt: at,
              checkInMethod: 'manual' as const,
            },
          }
        : stop,
    ),
  };
}

export function skipStop(
  draft: TripDraft,
  id: string,
  at: string,
): TripDraft {
  instant(at);

  const target = pending(draft, id);

  if (nextPendingStop(draft)?.id !== id) {
    throw new Error(
      'Chỉ bỏ qua địa điểm đang đến lượt.',
    );
  }

  if (
    draft.stops.some(
      stop => stop.progress && stop.id !== id,
    )
  ) {
    throw new Error(
      'Có chặng khác đang dở.',
    );
  }

  const copy = { ...target };
  delete copy.progress;
  delete copy.schedule;

  return clearTimeline({
    ...draft,
    tripActive: true,
    stops: draft.stops.filter(
      stop => stop.id !== id,
    ),
    skippedStops: [
      ...(draft.skippedStops ?? []),
      {
        stop: copy,
        skippedAt: at,
      },
    ],
  });
}

export function closeFinalVisit(
  draft: TripDraft,
  at: string,
): TripDraft {
  if (
    draft.stops.some(
      stop => !stop.completed || stop.progress,
    )
  ) {
    throw new Error(
      'Còn địa điểm chưa được xử lý.',
    );
  }

  return clearTimeline(
    closeVisits(draft, at),
  );
}