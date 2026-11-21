import { findPlaceById } from '@/data/places.local';
import type { StopSchedule, TripDraft } from './trip-model';

export function planSignature(draft: TripDraft): string {
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
  const s = value as StopSchedule | null;

  if (
    !s ||
    ![
      s.departureMinute,
      s.arrivalMinute,
      s.visitStartMinute,
      s.endMinute,
      s.travelSeconds,
      s.travelMeters,
      s.bufferMinutes,
      s.visitMinutes,
      s.requestedVisitMinutes,
    ].every(
      n =>
        typeof n === 'number' &&
        Number.isFinite(n) &&
        n >= 0,
    ) ||
    s.endMinute >= 1440 ||
    s.departureMinute > s.arrivalMinute ||
    s.arrivalMinute + s.bufferMinutes !== s.visitStartMinute ||
    s.visitStartMinute + s.visitMinutes !== s.endMinute ||
    s.visitMinutes < 1 ||
    s.visitMinutes > s.requestedVisitMinutes
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

  const ids = new Set(draft.stops.map(stop => stop.id));

  if (Object.keys(plan.entries).length !== ids.size) {
    throw new Error(
      'Kế hoạch chưa có giờ cho đủ các điểm. Dữ liệu cũ được giữ nguyên.',
    );
  }

  for (const [id, schedule] of Object.entries(plan.entries)) {
    if (!ids.has(id)) {
      throw new Error(
        'Kế hoạch chứa điểm không còn trong chuyến đi.',
      );
    }

    assertSchedule(schedule);
  }
}