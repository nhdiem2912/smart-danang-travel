import { findPlaceById } from '@/data/places.local';

import {
    PERIOD_WINDOWS,
    sortedStops,
    timeToMinute,
    type DraftStop,
    type StopSchedule,
    type TripDraft,
} from './trip-model';

import {
    assertSchedule,
    planSignature,
} from './trip-plan';

import {
    getRouteTable,
    validRoutePoint,
    type RouteTable,
} from './trip-routing';

const BUFFER = 5;
const MIN_VISIT = 10;

type Label = {
  mask: number;
  last: number;
  minute: number;
  meters: number;
  path: number[];
};

function placeFor(stop: DraftStop) {
  const place = findPlaceById(stop.placeId);

  if (
    !place?.coordinates_valid ||
    !validRoutePoint(place)
  ) {
    throw new Error(
      `Thiếu tọa độ hợp lệ: ${place?.name ?? stop.placeId}.`,
    );
  }

  return place;
}

function wantedMinutes(
  stop: DraftStop,
  draft: TripDraft,
) {
  const value =
    stop.visitMinutes ??
    placeFor(stop).visit_duration_minutes ??
    draft.settings.defaultVisitMinutes;

  if (
    !Number.isFinite(value) ||
    value < 1 ||
    value > 720
  ) {
    throw new Error(
      'Thời gian tham quan phải từ 1 đến 720 phút.',
    );
  }

  return Math.ceil(value);
}

function fitVisits(
  wanted: number[],
  budget: number,
): number[] {
  const minimum = wanted.map(n =>
    Math.min(MIN_VISIT, n),
  );

  const low = minimum.reduce((sum, n) => sum + n, 0);
  const high = wanted.reduce((sum, n) => sum + n, 0);

  if (budget < low) {
    throw new Error(
      'Không đủ giờ tham quan tối thiểu.',
    );
  }

  if (budget >= high) return wanted;

  const values = wanted.map(
    (n, i) =>
      minimum[i] +
      Math.floor(
        (n - minimum[i]) *
        (budget - low) /
        (high - low),
      ),
  );

  let remainder =
    budget - values.reduce((sum, n) => sum + n, 0);

  for (
    let i = 0;
    i < values.length && remainder > 0;
    i++
  ) {
    if (values[i] < wanted[i]) {
      values[i]++;
      remainder--;
    }
  }

  return values;
}

export async function solveDayOrder(
  stops: DraftStop[],
  table: RouteTable,
  wanted: number[],
  dayStart: number,
  dayEnd: number,
): Promise<number[]> {
  let states = new Map<string, Label[]>([
    [
      '0:-1',
      [{
        mask: 0,
        last: -1,
        minute: dayStart,
        meters: 0,
        path: [],
      }],
    ],
  ]);

  const locked = stops.map(
    stop => stop.completed || !!stop.orderLocked,
  );

  let work = 0;

  for (let slot = 0; slot < stops.length; slot++) {
    const next = new Map<string, Label[]>();
    const period = stops[slot].period;
    const window = PERIOD_WINDOWS[period];

    for (const labels of states.values()) {
      for (const state of labels) {
        for (let i = 0; i < stops.length; i++) {
          if (
            (state.mask & (1 << i)) ||
            stops[i].period !== period ||
            (locked[slot] ? i !== slot : locked[i])
          ) {
            continue;
          }

          const seconds =
            table.seconds[state.last + 1][i + 1];

          const meters =
            table.meters[state.last + 1][i + 1];

          if (seconds === null || meters === null) {
            continue;
          }

          const travel = Math.ceil(seconds / 60);

          const fixed = stops[i].completed
            ? stops[i].schedule
            : undefined;

          let finish: number;

          if (fixed) {
            if (
              state.minute > fixed.departureMinute ||
              fixed.departureMinute <
                Math.max(dayStart, window.start) ||
              fixed.departureMinute + travel >
                fixed.arrivalMinute
            ) {
              continue;
            }

            finish = fixed.endMinute;
          } else {
            finish =
              Math.max(
                state.minute,
                dayStart,
                window.start,
              ) +
              travel +
              BUFFER +
              Math.min(MIN_VISIT, wanted[i]);
          }

          if (
            finish > Math.min(dayEnd, window.end)
          ) {
            continue;
          }

          const candidate: Label = {
            mask: state.mask | (1 << i),
            last: i,
            minute: finish,
            meters: state.meters + meters,
            path: [...state.path, i],
          };

          const key = `${candidate.mask}:${i}`;
          const existing = next.get(key) ?? [];

          if (
            existing.some(
              label =>
                label.minute <= finish &&
                label.meters <= candidate.meters,
            )
          ) {
            continue;
          }

          next.set(key, [
            ...existing.filter(
              label =>
                !(
                  finish <= label.minute &&
                  candidate.meters <= label.meters
                ),
            ),
            candidate,
          ]);

          if (++work % 2000 === 0) {
            await new Promise<void>(resolve =>
              setTimeout(resolve, 0),
            );
          }
        }
      }
    }

    if (!next.size) {
      throw new Error(
        `${window.label}: không xếp đủ điểm trong giờ cho phép, hoặc không có tuyến nối. ` +
        'Hãy điều chỉnh buổi/giờ; điểm đã hoàn thành và lịch cũ được giữ nguyên.',
      );
    }

    states = next;
  }

  return [...states.values()]
    .flat()
    .sort(
      (a, b) =>
        a.meters - b.meters ||
        a.minute - b.minute,
    )[0].path;
}

function schedulePath(
  stops: DraftStop[],
  order: number[],
  table: RouteTable,
  wanted: number[],
  start: number,
  end: number,
): Record<string, StopSchedule> {
  const path = order.map(i => stops[i]);

  const travel = order.map((index, k) => {
    const previous =
      k === 0 ? 0 : order[k - 1] + 1;

    return {
      seconds: table.seconds[previous][index + 1]!,
      meters: table.meters[previous][index + 1]!,
    };
  });

  const fixed = path.map(stop =>
    stop.completed ? stop.schedule : undefined,
  );

  const latest = new Array<number>(
    path.length + 1,
  ).fill(end);

  for (let i = path.length - 1; i >= 0; i--) {
    const window =
      PERIOD_WINDOWS[path[i].period];

    latest[i] =
      fixed[i]?.departureMinute ??
      (
        Math.min(end, window.end, latest[i + 1]) -
        Math.ceil(travel[i].seconds / 60) -
        BUFFER -
        Math.min(MIN_VISIT, wanted[order[i]])
      );
  }

  const entries: Record<string, StopSchedule> = {};
  let cursor = start;
  let i = 0;

  while (i < path.length) {
    if (fixed[i]) {
      entries[path[i].id] = { ...fixed[i]! };
      cursor = fixed[i]!.endMinute;
      i++;
      continue;
    }

    const window = PERIOD_WINDOWS[path[i].period];

    let j = i + 1;

    while (
      j < path.length &&
      path[j].period === path[i].period &&
      !fixed[j]
    ) {
      j++;
    }

    cursor = Math.max(cursor, start, window.start);

    const fixedMinutes = travel
      .slice(i, j)
      .reduce(
        (sum, leg) =>
          sum +
          Math.ceil(leg.seconds / 60) +
          BUFFER,
        0,
      );

    const budget =
      Math.min(end, window.end, latest[j]) -
      cursor -
      fixedMinutes;

    const visits = fitVisits(
      order.slice(i, j).map(index => wanted[index]),
      budget,
    );

    for (let k = i; k < j; k++) {
      const arrival =
        cursor + Math.ceil(travel[k].seconds / 60);

      const visitStart = arrival + BUFFER;
      const finish = visitStart + visits[k - i];

      entries[path[k].id] = {
        departureMinute: cursor,
        arrivalMinute: arrival,
        visitStartMinute: visitStart,
        endMinute: finish,
        travelSeconds: travel[k].seconds,
        travelMeters: travel[k].meters,
        bufferMinutes: BUFFER,
        visitMinutes: visits[k - i],
        requestedVisitMinutes: wanted[order[k]],
      };

      cursor = finish;
    }

    i = j;
  }

  Object.values(entries).forEach(assertSchedule);

  return entries;
}

export async function optimizeTrip(
  draft: TripDraft,
): Promise<TripDraft> {
  if (!draft.stops.length) {
    throw new Error(
      'Hãy chọn địa điểm trước khi xếp giờ.',
    );
  }

  if (draft.stops.some(stop => stop.progress)) {
    throw new Error(
      'Có chặng đang dở. Hoàn tất hoặc hủy chặng trước khi xếp lại giờ.',
    );
  }

  if (
    draft.settings.travelMode === 'two_wheeler'
  ) {
    throw new Error(
      'Chưa có tuyến xe máy. Chọn ô tô hoặc đi bộ.',
    );
  }

  const { latitude, longitude } = draft.settings;

  if (
    latitude === null ||
    longitude === null ||
    !validRoutePoint({ latitude, longitude })
  ) {
    throw new Error(
      'Chọn địa chỉ, ghim trên bản đồ hoặc lấy GPS làm điểm xuất phát.',
    );
  }

  const start =
    timeToMinute(draft.settings.startTime);

  const end =
    timeToMinute(draft.settings.endTime);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start >= end
  ) {
    throw new Error(
      'Giờ kết thúc phải sau giờ bắt đầu.',
    );
  }

  const entries: Record<string, StopSchedule> = {};
  const orders = new Map<string, number>();

  for (let day = 0; day < draft.dayCount; day++) {
    const stops = sortedStops(
      draft.stops.filter(
        stop => stop.dayIndex === day,
      ),
    );

    if (!stops.length) continue;

    if (
      stops.length > 20 ||
      Object.keys(PERIOD_WINDOWS).some(
        period =>
          stops.filter(
            stop => stop.period === period,
          ).length > 8,
      )
    ) {
      throw new Error(
        'Bản so sánh đầy đủ hỗ trợ tối đa 8 điểm/buổi và 20 điểm/ngày.',
      );
    }

    for (
      const period of Object.keys(PERIOD_WINDOWS)
    ) {
      const group = stops.filter(
        stop => stop.period === period,
      );

      if (
        new Set(group.map(stop => stop.order)).size !==
        group.length
      ) {
        throw new Error(
          'Có điểm bị trùng thứ tự trong cùng buổi. Hãy chỉnh lại bằng nút lên/xuống trước khi tối ưu.',
        );
      }
    }

    stops.forEach(stop => {
      if (stop.completed && stop.schedule) {
        assertSchedule(stop.schedule);
      }
    });

    const wanted = stops.map(stop =>
      wantedMinutes(stop, draft),
    );

    const table = await getRouteTable(
      [
        { latitude, longitude },
        ...stops.map(placeFor),
      ],
      draft.settings.travelMode,
    );

    const order = await solveDayOrder(
      stops,
      table,
      wanted,
      start,
      end,
    );

    Object.assign(
      entries,
      schedulePath(
        stops,
        order,
        table,
        wanted,
        start,
        end,
      ),
    );

    order.forEach((index, slot) => {
      orders.set(
        stops[index].id,
        stops[slot].order,
      );
    });
  }

  const next: TripDraft = {
    ...draft,
    stops: draft.stops.map(stop =>
      stop.completed
        ? stop
        : {
            ...stop,
            order:
              orders.get(stop.id) ?? stop.order,
            schedule: entries[stop.id],
          },
    ),
  };

  next.plan = {
    version: 1,
    createdAt: new Date().toISOString(),
    signature: planSignature(next),
    entries,
  };

  return next;
}