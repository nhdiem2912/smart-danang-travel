import type { TravelMode } from './trip-model';

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteEstimate = {
  seconds: number;
  meters: number;
};

let queue: Promise<unknown> = Promise.resolve();
let lastStartedAt = 0;

const cache = new Map<
  string,
  {
    expiresAt: number;
    legs: RouteEstimate[];
  }
>();

export function queueRoutingRequest<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const next = queue.then(async () => {
    const delay = Math.max(
      0,
      1100 - (Date.now() - lastStartedAt),
    );

    if (delay) {
      await new Promise<void>(resolve =>
        setTimeout(resolve, delay),
      );
    }

    lastStartedAt = Date.now();
    return operation();
  });

  queue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}

export function validRoutePoint(
  point: RoutePoint,
): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.longitude) <= 180
  );
}

export async function estimateRouteSequence(
  from: RoutePoint,
  targets: RoutePoint[],
  mode: TravelMode,
): Promise<RouteEstimate[]> {
  if (mode === 'two_wheeler') {
    throw new Error(
      'Chưa hỗ trợ tuyến xe máy. Chọn đi bộ hoặc ô tô.',
    );
  }

  if (!targets.length) return [];

  const points = [from, ...targets];

  if (!points.every(validRoutePoint)) {
    throw new Error('Tọa độ tuyến không hợp lệ.');
  }

  if (points.length > 100) {
    throw new Error(
      'Nguồn tuyến công cộng hỗ trợ tối đa 99 điểm trong một buổi ở bản này.',
    );
  }

  if (
    points.every(
      point =>
        point.latitude === from.latitude &&
        point.longitude === from.longitude,
    )
  ) {
    return targets.map(() => ({
      seconds: 0,
      meters: 0,
    }));
  }

  const coordinates = points
    .map(point => `${point.longitude},${point.latitude}`)
    .join(';');

  const key = `${mode}:${coordinates}`;
  const hit = cache.get(key);

  if (hit && hit.expiresAt > Date.now()) {
    return hit.legs.map(leg => ({ ...leg }));
  }

  return queueRoutingRequest(async () => {
    const secondHit = cache.get(key);

    if (secondHit && secondHit.expiresAt > Date.now()) {
      return secondHit.legs.map(leg => ({ ...leg }));
    }

    const service =
      mode === 'walking' ? 'routed-foot' : 'routed-car';

    const profile =
      mode === 'walking' ? 'foot' : 'driving';

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      25000,
    );

    try {
      const response = await fetch(
        `https://routing.openstreetmap.de/${service}` +
          `/route/v1/${profile}/${coordinates}` +
          '?overview=false&steps=false&continue_straight=false',
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'Dịch vụ đang giới hạn yêu cầu. Đợi rồi thử lại.'
            : `Không tải được tuyến: HTTP ${response.status}.`,
        );
      }

      const body = (await response.json()) as {
        code?: string;
        routes?: {
          legs?: {
            duration?: number;
            distance?: number;
          }[];
        }[];
      };

      const raw = body.routes?.[0]?.legs;

      if (
        body.code !== 'Ok' ||
        !Array.isArray(raw) ||
        raw.length !== targets.length
      ) {
        throw new Error(
          'Không có tuyến hợp lệ qua đủ các điểm trong buổi.',
        );
      }

      const legs = raw.map(leg => {
        if (
          typeof leg.duration !== 'number' ||
          !Number.isFinite(leg.duration) ||
          leg.duration < 0 ||
          typeof leg.distance !== 'number' ||
          !Number.isFinite(leg.distance) ||
          leg.distance < 0
        ) {
          throw new Error(
            'Thời gian hoặc quãng đường tuyến không hợp lệ.',
          );
        }

        return {
          seconds: leg.duration,
          meters: leg.distance,
        };
      });

      if (cache.size >= 200) cache.clear();

      cache.set(key, {
        expiresAt: Date.now() + 30 * 60 * 1000,
        legs,
      });

      return legs.map(leg => ({ ...leg }));
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          'Tính tuyến quá 25 giây. Lịch cũ được giữ nguyên.',
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  });
}

export async function estimateRoute(
  from: RoutePoint,
  to: RoutePoint,
  mode: TravelMode,
): Promise<RouteEstimate> {
  return (
    await estimateRouteSequence(from, [to], mode)
  )[0];
}

export type RouteTable = {
  seconds: (number | null)[][];
  meters: (number | null)[][];
};

const tableCache = new Map<
  string,
  { until: number; value: RouteTable }
>();

const shapeCache = new Map<
  string,
  { until: number; value: [number, number][] }
>();

async function routingJson(
  kind: 'route' | 'table',
  points: RoutePoint[],
  mode: TravelMode,
  query: string,
): Promise<unknown> {
  if (mode === 'two_wheeler') {
    throw new Error(
      'Chưa có tuyến xe máy. Chọn ô tô hoặc đi bộ.',
    );
  }

  if (!points.every(validRoutePoint)) {
    throw new Error('Tọa độ tuyến không hợp lệ.');
  }

  const service =
    mode === 'walking' ? 'routed-foot' : 'routed-car';

  const profile =
    mode === 'walking' ? 'foot' : 'driving';

  const coordinates = points
    .map(point => `${point.longitude},${point.latitude}`)
    .join(';');

  return queueRoutingRequest(async () => {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      25000,
    );

    try {
      const response = await fetch(
        `https://routing.openstreetmap.de/${service}` +
          `/${kind}/v1/${profile}/${coordinates}?${query}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Dịch vụ tuyến trả HTTP ${response.status}. Hãy thử lại sau.`,
        );
      }

      return await response.json();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          'Nguồn tuyến chưa phản hồi sau 25 giây.',
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
}

export async function getRouteTable(
  points: RoutePoint[],
  mode: TravelMode,
): Promise<RouteTable> {
  if (points.length < 2 || points.length > 21) {
    throw new Error(
      'Chỉ tính tối đa 20 điểm mỗi ngày ở bản này.',
    );
  }

  const key = JSON.stringify([
    mode,
    points.map(point => [point.longitude, point.latitude]),
  ]);

  const hit = tableCache.get(key);

  if (hit && hit.until > Date.now()) return hit.value;

  const raw = (await routingJson(
    'table',
    points,
    mode,
    'annotations=duration,distance',
  )) as {
    code?: string;
    durations?: unknown;
    distances?: unknown;
  };

  const validMatrix = (
    value: unknown,
  ): value is (number | null)[][] =>
    Array.isArray(value) &&
    value.length === points.length &&
    value.every(
      row =>
        Array.isArray(row) &&
        row.length === points.length &&
        row.every(
          n =>
            n === null ||
            (
              typeof n === 'number' &&
              Number.isFinite(n) &&
              n >= 0
            ),
        ),
    );

  if (
    raw?.code !== 'Ok' ||
    !validMatrix(raw.durations) ||
    !validMatrix(raw.distances)
  ) {
    throw new Error(
      'Nguồn tuyến chưa cung cấp đủ quãng đường và thời gian. Lịch cũ được giữ nguyên.',
    );
  }

  const value = {
    seconds: raw.durations,
    meters: raw.distances,
  };

  if (tableCache.size >= 30) tableCache.clear();

  tableCache.set(key, {
    until: Date.now() + 30 * 60 * 1000,
    value,
  });

  return value;
}

export async function getRouteShape(
  points: RoutePoint[],
  mode: TravelMode,
): Promise<[number, number][]> {
  if (points.length < 2) return [];

  const key = JSON.stringify([
    mode,
    points.map(point => [point.longitude, point.latitude]),
  ]);

  const hit = shapeCache.get(key);

  if (hit && hit.until > Date.now()) return hit.value;

  const raw = (await routingJson(
    'route',
    points,
    mode,
    'overview=full&geometries=geojson&steps=false&continue_straight=false',
  )) as {
    code?: string;
    routes?: {
      geometry?: {
        type?: string;
        coordinates?: unknown;
      };
    }[];
  };

  const geometry = raw?.routes?.[0]?.geometry;

  if (
    raw?.code !== 'Ok' ||
    geometry?.type !== 'LineString' ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2 ||
    !geometry.coordinates.every(
      point =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Math.abs(point[0]) <= 180 &&
        Number.isFinite(point[1]) &&
        Math.abs(point[1]) <= 90,
    )
  ) {
    throw new Error('Chưa có hình tuyến đường hợp lệ.');
  }

  const value: [number, number][] =
    geometry.coordinates.map(point => [point[0], point[1]]);

  if (shapeCache.size >= 60) shapeCache.clear();

  shapeCache.set(key, {
    until: Date.now() + 30 * 60 * 1000,
    value,
  });

  return value;
}