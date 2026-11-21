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

function fitVisits(
  wanted: number[],
  budget: number,
): number[] {
  const minimum = wanted.map(
    value =>
      Math.min(
        MIN_VISIT,
        value,
      ),
  );

  const low = minimum.reduce(
    (sum, value) => sum + value,
    0,
  );

  const high = wanted.reduce(
    (sum, value) => sum + value,
    0,
  );

  if (budget < low) {
    throw new Error(
      'Không đủ giờ tham quan tối thiểu.',
    );
  }

  if (budget >= high) {
    return wanted;
  }

  const values = wanted.map(
    (value, index) =>
      minimum[index] +
      Math.floor(
        (
          value -
          minimum[index]
        ) *
        (budget - low) /
        (high - low),
      ),
  );

  let remainder =
    budget -
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    );

  for (
    let index = 0;
    index < values.length &&
    remainder > 0;
    index++
  ) {
    if (
      values[index] <
      wanted[index]
    ) {
      values[index]++;
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
  earliestNew = dayStart,
): Promise<number[]> {
  let states =
    new Map<string, Label[]>([
      [
        '0:-1',
        [
          {
            mask: 0,
            last: -1,
            minute: dayStart,
            meters: 0,
            path: [],
          },
        ],
      ],
    ]);

  const locked = stops.map(
    stop =>
      stop.completed ||
      !!stop.orderLocked,
  );

  let work = 0;

  for (
    let slot = 0;
    slot < stops.length;
    slot++
  ) {
    const next =
      new Map<string, Label[]>();

    const period =
      stops[slot].period;

    const window =
      PERIOD_WINDOWS[period];

    for (
      const labels
      of states.values()
    ) {
      for (
        const state
        of labels
      ) {
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
            stops[index].period !==
              period ||
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

          const travel =
            Math.ceil(
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

            finish =
              fixed.endMinute;
          } else {
            finish =
              Math.max(
                state.minute,
                earliestNew,
                dayStart,
                window.start,
              ) +
              travel +
              BUFFER +
              Math.min(
                MIN_VISIT,
                wanted[index],
              );
          }

          if (
            finish >
            Math.min(
              dayEnd,
              window.end,
            )
          ) {
            continue;
          }

          const candidate: Label = {
            mask:
              state.mask |
              (1 << index),
            last: index,
            minute: finish,
            meters:
              state.meters +
              meters,
            path: [
              ...state.path,
              index,
            ],
          };

          const key =
            `${candidate.mask}:${index}`;

          const existing =
            next.get(key) ?? [];

          const dominated =
            existing.some(
              label =>
                label.minute <=
                  finish &&
                label.meters <=
                  candidate.meters,
            );

          if (dominated) {
            continue;
          }

          next.set(key, [
            ...existing.filter(
              label =>
                !(
                  finish <=
                    label.minute &&
                  candidate.meters <=
                    label.meters
                ),
            ),
            candidate,
          ]);

          if (
            ++work % 2000 === 0
          ) {
            await new Promise<void>(
              resolve =>
                setTimeout(
                  resolve,
                  0,
                ),
            );
          }
        }
      }
    }

    if (!next.size) {
      throw new Error(
        `${window.label}: ` +
        'không xếp đủ điểm trong giờ cho phép, ' +
        'hoặc không có tuyến nối. ' +
        'Hãy điều chỉnh buổi/giờ; ' +
        'điểm đã hoàn thành và lịch cũ ' +
        'được giữ nguyên.',
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
  earliestNew = start,
): Record<string, StopSchedule> {
  const path = order.map(
    index => stops[index],
  );

  const travel = order.map(
    (index, position) => {
      const previous =
        position === 0
          ? 0
          : order[
              position - 1
            ] + 1;

      return {
        seconds:
          table.seconds[
            previous
          ][index + 1]!,
        meters:
          table.meters[
            previous
          ][index + 1]!,
      };
    },
  );

  const fixed = path.map(
    stop =>
      stop.completed
        ? stop.schedule
        : undefined,
  );

  const latest =
    new Array<number>(
      path.length + 1,
    ).fill(end);

  for (
    let index =
      path.length - 1;
    index >= 0;
    index--
  ) {
    const window =
      PERIOD_WINDOWS[
        path[index].period
      ];

    latest[index] =
      fixed[index]
        ?.departureMinute ??
      (
        Math.min(
          end,
          window.end,
          latest[index + 1],
        ) -
        Math.ceil(
          travel[index].seconds /
          60,
        ) -
        BUFFER -
        Math.min(
          MIN_VISIT,
          wanted[
            order[index]
          ],
        )
      );
  }

  const entries:
    Record<string, StopSchedule> = {};

  let cursor = start;
  let index = 0;

  while (
    index < path.length
  ) {
    if (fixed[index]) {
      entries[
        path[index].id
      ] = {
        ...fixed[index]!,
      };

      cursor =
        fixed[index]!.endMinute;

      index++;
      continue;
    }

    const window =
      PERIOD_WINDOWS[
        path[index].period
      ];

    let endIndex =
      index + 1;

    while (
      endIndex < path.length &&
      path[endIndex].period ===
        path[index].period &&
      !fixed[endIndex]
    ) {
      endIndex++;
    }

    cursor = Math.max(
      cursor,
      start,
      earliestNew,
      window.start,
    );

    const fixedMinutes =
      travel
        .slice(
          index,
          endIndex,
        )
        .reduce(
          (sum, leg) =>
            sum +
            Math.ceil(
              leg.seconds / 60,
            ) +
            BUFFER,
          0,
        );

    const budget =
      Math.min(
        end,
        window.end,
        latest[endIndex],
      ) -
      cursor -
      fixedMinutes;

    const visits = fitVisits(
      order
        .slice(
          index,
          endIndex,
        )
        .map(
          stopIndex =>
            wanted[stopIndex],
        ),
      budget,
    );

    for (
      let position = index;
      position < endIndex;
      position++
    ) {
      const arrival =
        cursor +
        Math.ceil(
          travel[position].seconds /
          60,
        );

      const visitStart =
        arrival + BUFFER;

      const finish =
        visitStart +
        visits[position - index];

      entries[
        path[position].id
      ] = {
        departureMinute:
          cursor,
        arrivalMinute:
          arrival,
        visitStartMinute:
          visitStart,
        endMinute:
          finish,
        travelSeconds:
          travel[position].seconds,
        travelMeters:
          travel[position].meters,
        bufferMinutes:
          BUFFER,
        visitMinutes:
          visits[position - index],
        requestedVisitMinutes:
          wanted[
            order[position]
          ],
      };

      cursor = finish;
    }

    index = endIndex;
  }

  Object.values(
    entries,
  ).forEach(assertSchedule);

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

    const order =
      await solveDayOrder(
        stops,
        table,
        wanted,
        start,
        end,
        earliestNew,
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