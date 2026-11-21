import { assertLegResult } from './trip-metrics';
import type { DraftStop } from './trip-model';

export function validateStopExtras(stop: DraftStop) {
  const finite = (value: unknown) =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0;

  const date = (value: unknown) =>
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value));

  const fail = () => {
    throw new Error(
      'Dữ liệu lịch/chặng không hợp lệ. Dữ liệu cũ được giữ nguyên.',
    );
  };

  if (
    stop.orderLocked !== undefined &&
    typeof stop.orderLocked !== 'boolean'
  ) {
    fail();
  }

  if (stop.result !== undefined) {
    assertLegResult(stop.result);
  }

  if (stop.previousResults !== undefined) {
    if (!Array.isArray(stop.previousResults)) fail();

    stop.previousResults.forEach(assertLegResult);
  }

  if (stop.schedule !== undefined) {
    const schedule = stop.schedule;

    if (
      !schedule ||
      ![
        schedule.departureMinute,
        schedule.arrivalMinute,
        schedule.visitStartMinute,
        schedule.endMinute,
        schedule.bufferMinutes,
        schedule.visitMinutes,
        schedule.requestedVisitMinutes,
      ].every(
        value => finite(value) && Number.isInteger(value),
      ) ||
      !finite(schedule.travelSeconds) ||
      !finite(schedule.travelMeters) ||
      schedule.departureMinute > schedule.arrivalMinute ||
      schedule.arrivalMinute + schedule.bufferMinutes !==
        schedule.visitStartMinute ||
      schedule.visitStartMinute + schedule.visitMinutes !==
        schedule.endMinute ||
      schedule.endMinute >= 1440 ||
      schedule.visitMinutes < 1 ||
      schedule.visitMinutes > schedule.requestedVisitMinutes
    ) {
      fail();
    }
  }

  if (stop.progress !== undefined) {
    const progress = stop.progress;

    if (
      !progress ||
      typeof progress.id !== 'string' ||
      !progress.id ||
      !date(progress.savedAt) ||
      !['driving', 'walking'].includes(progress.travelMode)
    ) {
      fail();
    }

    const checkpoint = progress.checkpoint;

    if (
      !checkpoint ||
      !(
        checkpoint.startedAt === null ||
        date(checkpoint.startedAt)
      ) ||
      !finite(checkpoint.elapsedMs) ||
      !finite(checkpoint.meters) ||
      !finite(checkpoint.pairs) ||
      !Number.isInteger(checkpoint.pairs) ||
      typeof checkpoint.partial !== 'boolean'
    ) {
      fail();
    }
  }
}