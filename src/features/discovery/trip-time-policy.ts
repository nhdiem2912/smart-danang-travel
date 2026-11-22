import {
  findPlaceById,
} from '@/data/places.local';
import {
  dateForDay,
  emptyDraft,
  isValidDate,
  PERIOD_WINDOWS,
  sortedStops,
  type DraftStop,
  type Period,
  type TripDraft
} from './trip-model';
import {
  venueNotice,
  venueWindows,
} from './venue-hours';

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

  if (
    date === now.date &&
    now.minute >= PERIOD_WINDOWS[period].end
  ) {
    return 'Buổi này đã kết thúc theo giờ Việt Nam.';
  }

  return null;
}
export function placeSlotError(
  d: TripDraft,
  dayIndex: number,
  period: Period,
  raw: string | null | undefined,
  ms = Date.now(),
): string | null {
  const error = slotError(
    d,
    dayIndex,
    period,
    ms,
  );

  if (error) return error;

  const date = dateForDay(
    d.startDate,
    dayIndex,
  );

  const now = vietnamClock(ms);
  const window = PERIOD_WINDOWS[period];

  const start = Math.max(
    window.start,
    date === now.date ? now.minute : 0,
  );

  try {
    const available = venueWindows(raw, date).some(
      ([open, close]) =>
        Math.max(open, start) <
        Math.min(close, window.end),
    );

    if (available) return null;

    return (
      'Không chọn được buổi này: ngoài giờ mở cửa ' +
      'hoặc đã hết thời gian mở cửa còn lại. ' +
      'Hãy chọn buổi/ngày khác.'
    );
  } catch (e) {
    return e instanceof Error
      ? e.message
      : 'Chưa đọc được giờ mở cửa.';
  }
}
export function assertCanAdd(
  d: TripDraft,
  input: Pick<
    DraftStop,
    'dayIndex' | 'period' | 'visitMinutes'
  > & {
    id?: string;
    placeId?: string;
  },
  ms = Date.now(),
  placeMinutes?: number | null,
) {
  const existing = d.stops.find(
    stop => stop.id === input.id,
  );

  if (existing?.completed) {
    throw new Error(
      'Không sửa hoặc chuyển địa điểm đã hoàn tất.',
    );
  }

  if (existing) {
    const source = slotError(
      d,
      existing.dayIndex,
      existing.period,
      ms,
    );

    if (source) throw new Error(source);
  }

  const place = input.placeId
    ? findPlaceById(input.placeId)
    : existing
      ? findPlaceById(existing.placeId)
      : undefined;

  if (input.placeId && !place) {
    throw new Error(
      'Địa điểm không còn trong danh mục.',
    );
  }

  const error = placeSlotError(
    d,
    input.dayIndex,
    input.period,
    place?.opening_hours_raw,
    ms,
  );

  if (error) throw new Error(error);

  const wanted =
    input.visitMinutes ??
    placeMinutes ??
    d.settings.defaultVisitMinutes;

  if (
    !Number.isInteger(wanted) ||
    wanted < 1 ||
    wanted > 720
  ) {
    throw new Error(
      'Thời gian tham quan dự kiến phải từ 1 đến 720 phút.',
    );
  }
}

export function assertCanStart(
  draft: TripDraft,
  stop: DraftStop,
  ms = Date.now(),
  travelSeconds?: number,
) {
  const target = draft.stops.find(
    item => item.id === stop.id,
  );

  if (!hasActiveTrip(draft) || !target) {
    throw new Error(
      'Không tìm thấy địa điểm trong chuyến đang hoạt động.',
    );
  }

  if (target.completed) {
    throw new Error(
      'Địa điểm này đã hoàn tất.',
    );
  }

  const active = draft.stops.find(
    item => item.progress,
  );

  if (active && active.id !== target.id) {
    throw new Error(
      'Hãy hoàn tất hoặc hủy chặng đang dở trước.',
    );
  }

  const next = sortedStops(draft.stops).find(
    item => !item.completed,
  );

  if (next?.id !== target.id) {
    const name = next
      ? findPlaceById(next.placeId)?.name
      : undefined;

    throw new Error(
      `Phải đi theo thứ tự lộ trình. Hãy hoàn thành ${name || 'địa điểm trước'} trước.`,
    );
  }

  const now = vietnamClock(ms);

  const date = dateForDay(
    draft.startDate,
    target.dayIndex,
  );

  if (date > now.date) {
    throw new Error(
      'Chưa đến ngày này. Bạn chỉ được xem kế hoạch, chưa thể bắt đầu.',
    );
  }

  if (date < now.date) {
    throw new Error(
      'Không bắt đầu chặng của ngày đã qua. Có thể check-in thủ công nếu bạn đã ghé.',
    );
  }

  if (travelSeconds === undefined) return;

  if (
    !Number.isFinite(travelSeconds) ||
    travelSeconds < 0
  ) {
    throw new Error(
      'Chưa có thời gian di chuyển hợp lệ.',
    );
  }

  const place = findPlaceById(target.placeId);

  if (!place) {
    throw new Error(
      'Địa điểm không còn trong danh mục.',
    );
  }

  const visit =
    target.visitMinutes ??
    place.visit_duration_minutes ??
    draft.settings.defaultVisitMinutes;

  if (!Number.isFinite(visit) || visit <= 0) {
    throw new Error(
      'Thời gian tham quan chưa hợp lệ.',
    );
  }

  const notice = venueNotice(
    place.opening_hours_raw,
    ms,
    travelSeconds,
    visit,
  );

  if (notice?.kind === 'blocked') {
    throw new Error(notice.message);
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
export function assertCanManualCheckIn(
  draft: TripDraft,
  stop: DraftStop,
  ms = Date.now(),
) {
  if (!hasActiveTrip(draft)) {
    throw new Error(
      'Chưa có chuyến đi đang hoạt động.',
    );
  }

  if (stop.completed) {
    throw new Error(
      'Địa điểm này đã được check-in.',
    );
  }

  if (
    !Number.isInteger(stop.dayIndex) ||
    stop.dayIndex < 0 ||
    stop.dayIndex >= draft.dayCount
  ) {
    throw new Error(
      'Ngày của địa điểm không hợp lệ.',
    );
  }

  const date = dateForDay(
    draft.startDate,
    stop.dayIndex,
  );

  if (date > vietnamClock(ms).date) {
    throw new Error(
      'Chưa đến ngày tham quan này. Không check-in trước cho ngày tương lai.',
    );
  }
}