import { findPlaceById } from '@/data/places.local';

import {
    PERIOD_WINDOWS,
    type DraftStop,
} from './trip-model';

import { venueWindows } from './venue-hours';

export type OpeningWindows = [number, number][][];

export function stopWindows(
  stops: DraftStop[],
  date: string,
): OpeningWindows {
  return stops.map(stop => {
    const place = findPlaceById(stop.placeId);

    if (!place) {
      throw new Error(
        'Địa điểm không còn trong danh mục.',
      );
    }

    try {
      return venueWindows(
        place.opening_hours_raw,
        date,
      );
    } catch (e) {
      throw new Error(
        `${place.name}: ${
          e instanceof Error
            ? e.message
            : 'Giờ mở cửa không hợp lệ.'
        }`,
      );
    }
  });
}

export function earliestVisit(
  stop: DraftStop,
  windows: [number, number][],
  ready: number,
  travel: number,
  visit: number,
  dayStart: number,
  dayEnd: number,
) {
  const period = PERIOD_WINDOWS[stop.period];

  const base = Math.max(
    ready,
    dayStart,
    period.start,
  );

  for (const [open, close] of windows) {
    const departure = Math.max(
      base,
      open - travel,
    );

    const arrival = departure + travel;
    const end = arrival + 5 + visit;

    if (
      end <= Math.min(
        close,
        period.end,
        dayEnd,
        1439,
      )
    ) {
      return {
        departure,
        arrival,
        end,
      };
    }
  }

  return null;
}

export function latestDeparture(
  stop: DraftStop,
  windows: [number, number][],
  deadline: number,
  travel: number,
  visit: number,
  dayStart: number,
): number | null {
  const period = PERIOD_WINDOWS[stop.period];

  for (let i = windows.length - 1; i >= 0; i--) {
    const [open, close] = windows[i];

    const departure =
      Math.min(
        deadline,
        close,
        period.end,
        1439,
      ) -
      5 -
      visit -
      travel;

    if (
      departure >=
        Math.max(dayStart, period.start) &&
      departure + travel >= open
    ) {
      return departure;
    }
  }

  return null;
}