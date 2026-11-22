import {
  findPlaceById,
} from '@/data/places.local';
import {
  dateForDay,
  PERIOD_WINDOWS,
  sortedStops,
  timeToMinute,
  type DraftStop,
  type StopSchedule,
  type TripDraft,
} from './trip-model';
import {
  earliestVisit,
  latestDeparture,
  stopWindows,
  type OpeningWindows,
} from './venue-scheduler';

import {
  assertSchedule,
  planSignature,
} from './trip-plan';

import {
  getRouteTable,
  validRoutePoint,
  type RouteTable,
} from './trip-routing';

import {
  vietnamClock,
} from './trip-time-policy';

const BUFFER = 5;
const MIN_VISIT = 10;

type Label = {
  mask: number;
  last: number;
  minute: number;
  meters: number;
  path: number[];
};

function placeFor(
  stop: DraftStop,
) {
  const place = findPlaceById(
    stop.placeId,
  );

  if (
    !place?.coordinates_valid ||
    !validRoutePoint(place)
  ) {
    throw new Error(
      'Thiếu tọa độ hợp lệ: ' +
      `${place?.name ?? stop.placeId}.`,
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
    placeFor(
      stop,
    ).visit_duration_minutes ??
    draft.settings.defaultVisitMinutes;

  if (
    !Number.isFinite(value) ||
    value < 1 ||
    value > 720
  ) {
    throw new Error(
      'Thời gian tham quan phải ' +
      'từ 1 đến 720 phút.',
    );
  }

  return Math.ceil(value);
}



export async function solveDayOrder(
  stops: DraftStop[],
  table: RouteTable,
  wanted: number[],
  dayStart: number,
  dayEnd: number,
  earliestNew = dayStart,
  openings: OpeningWindows = stops.map(
    () => [[0, 1440]],
  ),
): Promise<number[]> {
  if (!stops.length) return [];

  const locked = stops.map(
    stop =>
      stop.completed ||
      !!stop.orderLocked,
  );

  const ready = Math.max(
    dayStart,
    earliestNew,
  );

  async function search(
    visits: number[],
  ): Promise<number[] | null> {
    let states = new Map<string, Label[]>([
      [
        '0:-1',
        [
          {
            mask: 0,
            last: -1,
            minute: ready,
            meters: 0,
            path: [],
          },
        ],
      ],
    ]);

    let work = 0;

    for (
      let slot = 0;
      slot < stops.length;
      slot++
    ) {
      const next =
        new Map<string, Label[]>();

      const period = stops[slot].period;
      const window = PERIOD_WINDOWS[period];

      for (const labels of states.values()) {
        for (const state of labels) {
          for (
            let index = 0;
            index < stops.length;
            index++
          ) {
            if (
              (
                state.mask &
                (1 << index)
              ) ||
              stops[index].period !== period ||
              (
                locked[slot]
                  ? index !== slot
                  : locked[index]
              )
            ) {
              continue;
            }

            const seconds =
              table.seconds[
                state.last + 1
              ][index + 1];

            const meters =
              table.meters[
                state.last + 1
              ][index + 1];

            if (
              seconds === null ||
              meters === null
            ) {
              continue;
            }

            const travel = Math.ceil(
              seconds / 60,
            );

            const fixed =
              stops[index].completed
                ? stops[index].schedule
                : undefined;

            let finish: number;

            if (fixed) {
              if (
                state.minute >
                  fixed.departureMinute ||
                fixed.departureMinute <
                  Math.max(
                    dayStart,
                    window.start,
                  ) ||
                fixed.departureMinute +
                  travel >
                  fixed.arrivalMinute
              ) {
                continue;
              }

              finish = fixed.endMinute;
            } else {
              const visit = earliestVisit(
                stops[index],
                openings[index],
                state.minute,
                travel,
                visits[index],
                dayStart,
                dayEnd,
              );

              if (!visit) continue;

              finish = visit.end;
            }

            if (
              finish >
              Math.min(dayEnd, window.end)
            ) {
              continue;
            }

            const candidate: Label = {
              mask:
                state.mask |
                (1 << index),
              last: index,
              minute: finish,
              meters: state.meters + meters,
              path: [
                ...state.path,
                index,
              ],
            };

            const key =
              `${candidate.mask}:${index}`;

            const existing =
              next.get(key) ?? [];

            if (
              existing.some(
                label =>
                  label.minute <= finish &&
                  label.meters <=
                    candidate.meters,
              )
            ) {
              continue;
            }

            next.set(key, [
              ...existing.filter(
                label =>
                  !(
                    finish <= label.minute &&
                    candidate.meters <=
                      label.meters
                  ),
              ),
              candidate,
            ]);

            if (++work % 2000 === 0) {
              await new Promise<void>(
                resolve =>
                  setTimeout(resolve, 0),
              );
            }
          }
        }
      }

      if (!next.size) return null;

      states = next;
    }

    const best = [...states.values()]
      .flat()
      .sort(
        (a, b) =>
          a.minute - b.minute ||
          a.meters - b.meters,
      )[0];

    return best?.path ?? null;
  }

  // Thử giữ đủ thời gian tham quan trước.
  const full = await search(wanted);

  if (full) return full;

  // Giữ cơ chế rút ngắn dự kiến khi lịch quá chật.
  const shortened = await search(
    wanted.map(
      minutes =>
        Math.min(MIN_VISIT, minutes),
    ),
  );

  if (shortened) return shortened;

  throw new Error(
    'Không xếp đủ địa điểm trong giờ mở cửa ' +
    'và khung giờ đã chọn. ' +
    'Hãy đổi buổi, giờ hoặc giảm số địa điểm. ' +
    'Lịch cũ được giữ nguyên.',
  );
}

function schedulePath(
  stops: DraftStop[],
  order: number[],
  table: RouteTable,
  wanted: number[],
  start: number,
  end: number,
  earliestNew = start,
  openings: OpeningWindows = stops.map(
    () => [[0, 1440]],
  ),
): Record<string, StopSchedule> {
    const fullEntries:
    Record<string, StopSchedule> = {};

  let fullCursor = Math.max(
    start,
    earliestNew,
  );

  let fitsFull = true;

  for (
    let k = 0;
    k < order.length;
    k++
  ) {
    const index = order[k];
    const stop = stops[index];

    if (
      stop.completed &&
      stop.schedule
    ) {
      fullEntries[stop.id] = {
        ...stop.schedule,
      };

      fullCursor =
        stop.schedule.endMinute;

      continue;
    }

    const previous =
      k === 0
        ? 0
        : order[k - 1] + 1;

    const seconds =
      table.seconds[
        previous
      ][index + 1]!;

    const meters =
      table.meters[
        previous
      ][index + 1]!;

    const slot = earliestVisit(
      stop,
      openings[index],
      fullCursor,
      Math.ceil(seconds / 60),
      wanted[index],
      start,
      end,
    );

    if (!slot) {
      fitsFull = false;
      break;
    }

    fullEntries[stop.id] = {
      departureMinute: slot.departure,
      arrivalMinute: slot.arrival,
      visitStartMinute:
        slot.arrival + BUFFER,
      endMinute: slot.end,
      travelSeconds: seconds,
      travelMeters: meters,
      bufferMinutes: BUFFER,
      visitMinutes: wanted[index],
      requestedVisitMinutes:
        wanted[index],
    };

    fullCursor = slot.end;
  }

  if (fitsFull) {
    Object.values(fullEntries)
      .forEach(assertSchedule);

    return fullEntries;
  }
  const path = order.map(i => stops[i]);

  const travel = order.map((index, k) => {
    const previous =
      k === 0 ? 0 : order[k - 1] + 1;

    return {
      seconds:
        table.seconds[previous][index + 1]!,
      meters:
        table.meters[previous][index + 1]!,
    };
  });

  const latest = new Array<number>(
    path.length + 1,
  ).fill(end);

  for (let i = path.length - 1; i >= 0; i--) {
    const value = latestDeparture(
      path[i],
      openings[order[i]],
      latest[i + 1],
      Math.ceil(travel[i].seconds / 60),
      Math.min(
        MIN_VISIT,
        wanted[order[i]],
      ),
      start,
    );

    if (value === null) {
      throw new Error(
        'Không đủ thời gian trong giờ mở cửa. ' +
        'Hãy đổi buổi hoặc giảm số địa điểm.',
      );
    }

    latest[i] = value;
  }

  const entries: Record<string, StopSchedule> = {};
  let cursor = Math.max(start, earliestNew);

  for (let i = 0; i < path.length; i++) {
    const stop = path[i];
    const index = order[i];

    const minutes = Math.ceil(
      travel[i].seconds / 60,
    );

    const minimum = Math.min(
      MIN_VISIT,
      wanted[index],
    );

    const slot = earliestVisit(
      stop,
      openings[index],
      cursor,
      minutes,
      minimum,
      start,
      Math.min(end, latest[i + 1]),
    );

    if (!slot) {
      throw new Error(
        'Không xếp được lịch phù hợp giờ mở cửa. ' +
        'Các địa điểm đã chọn vẫn được giữ nguyên.',
      );
    }

    const closing = openings[index].find(
      ([open, close]) =>
        slot.arrival >= open &&
        slot.arrival < close,
    )![1];

    const limit = Math.min(
      closing,
      PERIOD_WINDOWS[stop.period].end,
      end,
      latest[i + 1],
      1439,
    );

    const visit = Math.min(
      wanted[index],
      limit - slot.arrival - BUFFER,
    );

    const finish =
      slot.arrival + BUFFER + visit;

    entries[stop.id] = {
      departureMinute: slot.departure,
      arrivalMinute: slot.arrival,
      visitStartMinute: slot.arrival + BUFFER,
      endMinute: finish,
      travelSeconds: travel[i].seconds,
      travelMeters: travel[i].meters,
      bufferMinutes: BUFFER,
      visitMinutes: visit,
      requestedVisitMinutes: wanted[index],
    };

    cursor = finish;
  }

  Object.values(entries).forEach(assertSchedule);

  return entries;
}

export async function optimizeTrip(
  draft: TripDraft,
): Promise<TripDraft> {
  if (
    !draft.stops.length
  ) {
    throw new Error(
      'Hãy chọn địa điểm trước khi xếp giờ.',
    );
  }

  if (
    draft.stops.some(
      stop => stop.progress,
    )
  ) {
    throw new Error(
      'Có chặng đang dở. Hoàn tất hoặc ' +
      'hủy chặng trước khi xếp lại giờ.',
    );
  }

  if (
    draft.settings.travelMode ===
    'two_wheeler'
  ) {
    throw new Error(
      'Chưa có tuyến xe máy. ' +
      'Chọn ô tô hoặc đi bộ.',
    );
  }

  const {
    latitude,
    longitude,
  } = draft.settings;

  if (
    latitude === null ||
    longitude === null ||
    !validRoutePoint({
      latitude,
      longitude,
    })
  ) {
    throw new Error(
      'Chọn địa chỉ, ghim trên bản đồ ' +
      'hoặc lấy GPS làm điểm xuất phát.',
    );
  }

  const start = timeToMinute(
    draft.settings.startTime,
  );

  const end = timeToMinute(
    draft.settings.endTime,
  );

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start >= end
  ) {
    throw new Error(
      'Giờ kết thúc phải sau giờ bắt đầu.',
    );
  }

  const entries:
    Record<string, StopSchedule> = {};

  const orders =
    new Map<string, number>();

  for (
    let day = 0;
    day < draft.dayCount;
    day++
  ) {
    const allStops =
      sortedStops(
        draft.stops.filter(
          stop =>
            stop.dayIndex === day,
        ),
      );

    const completed =
      allStops.filter(
        stop => stop.completed,
      );

    completed.forEach(stop => {
      if (stop.schedule) {
        assertSchedule(
          stop.schedule,
        );

        entries[
          stop.id
        ] = stop.schedule;
      }
    });

    // Điểm hoàn tất chỉ được giữ lại,
    // không đem xếp vào thời gian còn lại.
    const stops = allStops.filter(
      stop => !stop.completed,
    );

    if (!stops.length) {
      continue;
    }

    const dayDate = dateForDay(
      draft.startDate,
      day,
    );

    if (
      dayDate <
      vietnamClock().date
    ) {
      throw new Error(
        'Không xếp lại chặng chưa hoàn tất ' +
        'của ngày đã qua. Hãy xử lý các ' +
        'điểm quá hạn trước.',
      );
    }

    const lastCompleted =
      completed.reduce<
        DraftStop | undefined
      >(
        (last, stop) => {
          if (!last) {
            return stop;
          }

          const previous =
            last.result
              ?.arrivedAt ?? '';

          const current =
            stop.result
              ?.arrivedAt ?? '';

          return current >= previous
            ? stop
            : last;
        },
        undefined,
      );

    const origin =
      lastCompleted
        ? placeFor(
            lastCompleted,
          )
        : {
            latitude,
            longitude,
          };

    if (
      stops.length > 20 ||
      Object.keys(
        PERIOD_WINDOWS,
      ).some(
        period =>
          stops.filter(
            stop =>
              stop.period ===
              period,
          ).length > 8,
      )
    ) {
      throw new Error(
        'Hỗ trợ tối đa 8 điểm chưa đi/buổi ' +
        'và 20 điểm chưa đi/ngày.',
      );
    }

    for (
      const period
      of Object.keys(
        PERIOD_WINDOWS,
      )
    ) {
      const group =
        stops.filter(
          stop =>
            stop.period ===
            period,
        );

      const uniqueOrders =
        new Set(
          group.map(
            stop => stop.order,
          ),
        );

      if (
        uniqueOrders.size !==
        group.length
      ) {
        throw new Error(
          'Có điểm bị trùng thứ tự trong ' +
          'cùng buổi. Hãy chỉnh lại bằng ' +
          'nút lên/xuống trước khi tối ưu.',
        );
      }
    }

    const wanted =
      stops.map(
        stop =>
          wantedMinutes(
            stop,
            draft,
          ),
      );

    const table =
      await getRouteTable(
        [
          origin,
          ...stops.map(
            placeFor,
          ),
        ],
        draft.settings.travelMode,
      );

    // Đọc lại giờ sau khi đã chờ API tuyến đường.
    const now = vietnamClock();

    if (
      dayDate < now.date
    ) {
      throw new Error(
        'Ngày đã thay đổi trong lúc tính tuyến. ' +
        'Hãy thử lại.',
      );
    }

    const earliestNew =
      dayDate === now.date
        ? Math.max(
            start,
            Math.ceil(
              now.minute,
            ),
          )
        : start;

        const openings = stopWindows(
      stops,
      dayDate,
    );

    const order = await solveDayOrder(
      stops,
      table,
      wanted,
      start,
      end,
      earliestNew,
      openings,
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
        earliestNew,
        openings,
      ),
    );

    order.forEach(
      (stopIndex, slot) => {
        orders.set(
          stops[
            stopIndex
          ].id,
          stops[slot].order,
        );
      },
    );
  }

  const finalClock =
    vietnamClock();

  const becameOutdated =
    draft.stops.some(stop => {
      if (stop.completed) {
        return false;
      }

      const date = dateForDay(
        draft.startDate,
        stop.dayIndex,
      );

      return (
        date < finalClock.date ||
        (
          date ===
            finalClock.date &&
          (
            entries[
              stop.id
            ]?.departureMinute ?? -1
          ) <
            finalClock.minute
        )
      );
    });

  if (becameOutdated) {
    throw new Error(
      'Thời gian đã thay đổi trong lúc tối ưu. ' +
      'Hãy tính lại để không xếp giờ vào quá khứ.',
    );
  }

  const next: TripDraft = {
    ...draft,
    stops: draft.stops.map(
      stop =>
        stop.completed
          ? stop
          : {
              ...stop,
              order:
                orders.get(
                  stop.id,
                ) ??
                stop.order,
              schedule:
                entries[
                  stop.id
                ],
            },
    ),
  };

  next.plan = {
    version: 1,
    createdAt:
      new Date().toISOString(),
    signature:
      planSignature(next),
    entries,
  };

  return next;
}