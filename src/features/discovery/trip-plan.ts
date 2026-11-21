import {
  findPlaceById,
} from '@/data/places.local';

import type {
  StopSchedule,
  TripDraft,
} from './trip-model';

export function planSignature(
  draft: TripDraft,
): string {
  return JSON.stringify([
    draft.startDate,
    draft.dayCount,
    draft.settings,
    [...draft.stops]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(stop => {
        const place = findPlaceById(stop.placeId);

        return [
          stop.id,
          stop.placeId,
          stop.dayIndex,
          stop.period,
          stop.order,
          stop.visitMinutes,
          !!stop.orderLocked,
          place?.latitude,
          place?.longitude,
          place?.visit_duration_minutes,
        ];
      }),
  ]);
}

export function currentPlan(draft: TripDraft) {
  return draft.plan?.signature === planSignature(draft)
    ? draft.plan
    : undefined;
}

export function assertSchedule(
  value: unknown,
): asserts value is StopSchedule {
  const schedule = value as StopSchedule | null;

  if (
    !schedule ||
    ![
      schedule.departureMinute,
      schedule.arrivalMinute,
      schedule.visitStartMinute,
      schedule.endMinute,
      schedule.travelSeconds,
      schedule.travelMeters,
      schedule.bufferMinutes,
      schedule.visitMinutes,
      schedule.requestedVisitMinutes,
    ].every(
      number =>
        typeof number === 'number' &&
        Number.isFinite(number) &&
        number >= 0,
    ) ||
    schedule.endMinute >= 1440 ||
    schedule.departureMinute > schedule.arrivalMinute ||
    schedule.arrivalMinute + schedule.bufferMinutes !==
      schedule.visitStartMinute ||
    schedule.visitStartMinute + schedule.visitMinutes !==
      schedule.endMinute ||
    schedule.visitMinutes < 1 ||
    schedule.visitMinutes >
      schedule.requestedVisitMinutes
  ) {
    throw new Error(
      'Giờ kế hoạch không hợp lệ. Dữ liệu cũ được giữ nguyên.',
    );
  }
}

export function validatePlan(draft: TripDraft) {
  if (draft.plan === undefined) return;

  const plan = draft.plan;

  if (
    !plan ||
    plan.version !== 1 ||
    typeof plan.signature !== 'string' ||
    typeof plan.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(plan.createdAt)) ||
    !plan.entries ||
    typeof plan.entries !== 'object' ||
    Array.isArray(plan.entries)
  ) {
    throw new Error(
      'Kế hoạch không hợp lệ. Dữ liệu cũ được giữ nguyên.',
    );
  }

  const ids = new Set(
    draft.stops.map(stop => stop.id),
  );

  const missingSchedule = draft.stops.some(
    stop =>
      !stop.completed &&
      !Object.prototype.hasOwnProperty.call(
        plan.entries,
        stop.id,
      ),
  );

  if (missingSchedule) {
    throw new Error(
      'Kế hoạch chưa có giờ cho đủ các điểm. ' +
      'Dữ liệu cũ được giữ nguyên.',
    );
  }

  for (
    const [id, schedule]
    of Object.entries(plan.entries)
  ) {
    if (!ids.has(id)) {
      throw new Error(
        'Kế hoạch chứa điểm không còn trong chuyến đi.',
      );
    }

    assertSchedule(schedule);
  }
}