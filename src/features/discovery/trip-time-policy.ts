import {
    findPlaceById,
} from '@/data/places.local';

import {
    dateForDay,
    emptyDraft,
    isValidDate,
    PERIOD_WINDOWS,
    timeToMinute,
    type DraftStop,
    type Period,
    type TripDraft,
} from './trip-model';

export function vietnamClock(
  ms = Date.now(),
) {
  const date = new Date(
    ms + 7 * 3600000,
  );

  return {
    date: date
      .toISOString()
      .slice(0, 10),

    minute:
      date.getUTCHours() * 60 +
      date.getUTCMinutes() +
      date.getUTCSeconds() / 60,
  };
}

export function hasActiveTrip(
  draft: TripDraft,
) {
  return (
    draft.tripActive === true ||
    draft.stops.length > 0
  );
}

function closedDay(
  draft: TripDraft,
  dayIndex: number,
) {
  const stops = draft.stops.filter(
    stop => stop.dayIndex === dayIndex,
  );

  return (
    stops.length > 0 &&
    stops.every(stop => stop.completed)
  );
}

export function slotError(
  draft: TripDraft,
  dayIndex: number,
  period: Period,
  ms = Date.now(),
): string | null {
  if (!hasActiveTrip(draft)) {
    return 'Hãy tạo chuyến đi và chọn ngày trước.';
  }

  if (
    !Number.isInteger(dayIndex) ||
    dayIndex < 0 ||
    dayIndex >= draft.dayCount ||
    !PERIOD_WINDOWS[period]
  ) {
    return 'Ngày hoặc buổi không hợp lệ.';
  }

  const now = vietnamClock(ms);

  const date = dateForDay(
    draft.startDate,
    dayIndex,
  );

  if (date < now.date) {
    return 'Ngày này đã qua theo giờ Việt Nam.';
  }

  if (closedDay(draft, dayIndex)) {
    return (
      'Ngày này đã hoàn tất, không thêm hoặc ' +
      'chuyển địa điểm vào được nữa.'
    );
  }

  const window = PERIOD_WINDOWS[period];

  const end = Math.min(
    window.end,
    timeToMinute(draft.settings.endTime),
  );

  const start = Math.max(
    window.start,
    timeToMinute(draft.settings.startTime),
  );

  if (end <= start) {
    return (
      'Buổi này nằm ngoài giờ hoạt động ' +
      'của chuyến đi.'
    );
  }

  if (
    date === now.date &&
    now.minute >= end
  ) {
    return (
      'Buổi này đã kết thúc theo giờ Việt Nam.'
    );
  }

  const group = draft.stops.filter(
    stop =>
      stop.dayIndex === dayIndex &&
      stop.period === period,
  );

  if (
    group.length > 0 &&
    group.every(stop => stop.completed)
  ) {
    return 'Buổi này đã hoàn tất.';
  }

  return null;
}

export function assertCanAdd(
  draft: TripDraft,

  input: Pick<
    DraftStop,
    'dayIndex' | 'period' | 'visitMinutes'
  > & {
    id?: string;
  },

  ms = Date.now(),

  placeMinutes?: number | null,
) {
  const existing = draft.stops.find(
    stop => stop.id === input.id,
  );

  if (existing?.completed) {
    throw new Error(
      'Không sửa hoặc chuyển địa điểm đã hoàn tất.',
    );
  }

  if (existing) {
    const oldError = slotError(
      draft,
      existing.dayIndex,
      existing.period,
      ms,
    );

    if (oldError) {
      throw new Error(oldError);
    }
  }

  const error = slotError(
    draft,
    input.dayIndex,
    input.period,
    ms,
  );

  if (error) {
    throw new Error(error);
  }

  const now = vietnamClock(ms);
  const window = PERIOD_WINDOWS[input.period];

  const date = dateForDay(
    draft.startDate,
    input.dayIndex,
  );

  const begin = Math.max(
    window.start,
    timeToMinute(draft.settings.startTime),
    date === now.date
      ? now.minute
      : 0,
  );

  const end = Math.min(
    window.end,
    timeToMinute(draft.settings.endTime),
  );

  const pending = draft.stops.filter(
    stop =>
      stop.id !== input.id &&
      !stop.completed &&
      stop.dayIndex === input.dayIndex &&
      stop.period === input.period,
  );

  const newVisitMinutes =
    input.visitMinutes ??
    placeMinutes ??
    draft.settings.defaultVisitMinutes;

  const pendingVisitMinutes = pending.reduce(
    (total, stop) =>
      total +
      (
        stop.visitMinutes ??
        findPlaceById(
          stop.placeId,
        )?.visit_duration_minutes ??
        draft.settings.defaultVisitMinutes
      ),
    0,
  );

  const required =
    newVisitMinutes + pendingVisitMinutes;

  if (begin + required > end) {
    throw new Error(
      'Buổi này không còn đủ thời gian tham quan. ' +
      'Hãy chọn buổi/ngày khác hoặc giảm thời gian dừng.',
    );
  }
}

export function assertCanStart(
  draft: TripDraft,
  stop: DraftStop,
  ms = Date.now(),
) {
  const now = vietnamClock(ms);

  const date = dateForDay(
    draft.startDate,
    stop.dayIndex,
  );

  if (date > now.date) {
    throw new Error(
      'Chưa đến ngày này. Bạn chỉ được xem ' +
      'kế hoạch, chưa thể bắt đầu.',
    );
  }

  if (date < now.date) {
    throw new Error(
      'Không bắt đầu chặng của ngày đã qua.',
    );
  }

  if (stop.completed) {
    throw new Error(
      'Địa điểm này đã hoàn tất.',
    );
  }

  const window = PERIOD_WINDOWS[stop.period];

  const earliest = Math.max(
    timeToMinute(
      draft.settings.startTime,
    ),
    stop.schedule?.departureMinute ??
      window.start,
  );

  const latest = Math.min(
    window.end,
    timeToMinute(
      draft.settings.endTime,
    ),
  );

  if (now.minute < earliest) {
    throw new Error(
      'Chưa đến giờ khởi hành của chặng này.',
    );
  }

  if (now.minute >= latest) {
    throw new Error(
      'Buổi này đã kết thúc.',
    );
  }

  if (!stop.progress) {
    const visitMinutes =
      stop.visitMinutes ??
      findPlaceById(
        stop.placeId,
      )?.visit_duration_minutes ??
      draft.settings.defaultVisitMinutes;

    const travelMinutes =
      (stop.schedule?.travelSeconds ?? 0) / 60;

    const bufferMinutes =
      stop.schedule?.bufferMinutes ?? 0;

    const required =
      visitMinutes +
      travelMinutes +
      bufferMinutes;

    if (now.minute + required > latest) {
      throw new Error(
        'Không còn đủ thời gian cho chặng này ' +
        'trong buổi đã chọn.',
      );
    }
  }
}

export function resetTripDates(
  startDate: string,
  dayCount: number,
  active = true,
  ms = Date.now(),
): TripDraft {
  if (
    !isValidDate(startDate) ||
    startDate < vietnamClock(ms).date ||
    !Number.isInteger(dayCount) ||
    dayCount < 1 ||
    dayCount > 14
  ) {
    throw new Error(
      'Chọn ngày từ hôm nay trở đi, ' +
      'thời lượng từ 1 đến 14 ngày.',
    );
  }

  return {
    ...emptyDraft(),
    startDate,
    dayCount,
    tripActive: active,
  };
}

export function startError(
  draft: TripDraft,
  stop: DraftStop,
  ms: number,
): string | null {
  try {
    assertCanStart(draft, stop, ms);
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : 'Chưa thể bắt đầu chặng này.';
  }
}