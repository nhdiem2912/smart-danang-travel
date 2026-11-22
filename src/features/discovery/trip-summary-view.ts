import {
    dateForDay,
    sortedStops,
    type DraftStop,
    type TripDraft,
} from './trip-model';

export function isUpcomingStop(stop: DraftStop) {
  return !stop.completed && !stop.progress;
}

export function pendingDayView(
  draft: TripDraft,
  chosenDay: number | null,
  today: string,
) {
  const pending = sortedStops(
    draft.stops.filter(isUpcomingStop),
  );

  const days = Array.from(
    { length: draft.dayCount },
    (_, index) => ({
      index,
      date: dateForDay(draft.startDate, index),
      count: pending.filter(
        stop => stop.dayIndex === index,
      ).length,
    }),
  );

  const defaultDay =
    days.find(
      day => day.date >= today && day.count > 0,
    ) ??
    days.find(day => day.count > 0) ??
    days.find(day => day.date >= today) ??
    days[days.length - 1];

  const dayIndex =
    chosenDay !== null &&
    Number.isInteger(chosenDay) &&
    chosenDay >= 0 &&
    chosenDay < draft.dayCount
      ? chosenDay
      : defaultDay?.index ?? 0;

  return {
    days,
    dayIndex,
    stops: pending.filter(
      stop => stop.dayIndex === dayIndex,
    ),
    total: pending.length,
  };
}

export function withoutPendingDay(
  draft: TripDraft,
  dayIndex: number,
  expectedTripId: string,
): TripDraft {
  if (draft.id !== expectedTripId) {
    throw new Error(
      'Chuyến đi đã thay đổi. Hãy mở lại danh sách.',
    );
  }

  if (
    !Number.isInteger(dayIndex) ||
    dayIndex < 0 ||
    dayIndex >= draft.dayCount
  ) {
    throw new Error('Ngày không hợp lệ.');
  }

  if (draft.stops.some(stop => stop.progress)) {
    throw new Error(
      'Hãy hoàn tất hoặc hủy chặng đang đi trước khi sửa lịch.',
    );
  }

  return {
    ...draft,
    stops: draft.stops.filter(
      stop =>
        stop.dayIndex !== dayIndex ||
        !isUpcomingStop(stop),
    ),
  };
}