export type NavPoint = [number, number];

export type NavFix = {
  point: NavPoint;
  accuracy: number | null;
  timestamp: number;
};

type Step = {
  at: number;
  text: string;
  icon: string;
};

export type NavigationRoute = {
  points: NavPoint[];
  cumulative: number[];
  steps: Step[];
  length: number;
};

export type TurnGuidance = {
  status: 'ok' | 'near' | 'starting' | 'weak' | 'uncertain' | 'off-route';
  icon: string;
  text: string;
  turnMeters: number | null;
  remainingMeters: number | null;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Dữ liệu chỉ dẫn không hợp lệ.');
  }
  return value as Record<string, unknown>;
}

function isPoint(value: unknown): value is NavPoint {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

function distance(a: NavPoint, b: NavPoint) {
  const rad = Math.PI / 180;
  const h =
    Math.sin((b[1] - a[1]) * rad / 2) ** 2 +
    Math.cos(a[1] * rad) *
      Math.cos(b[1] * rad) *
      Math.sin((b[0] - a[0]) * rad / 2) ** 2;

  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function instruction(step: Record<string, unknown>) {
  const maneuver = record(step.maneuver);
  const type = String(maneuver.type ?? '');
  const modifier = String(maneuver.modifier ?? '');
  const road =
    typeof step.name === 'string' ? step.name.trim() : '';
  const suffix = road ? ` vào ${road}` : '';

  const turns: Record<string, [string, string]> = {
    left: ['←', 'Rẽ trái'],
    right: ['→', 'Rẽ phải'],
    'slight left': ['↖', 'Chếch trái'],
    'slight right': ['↗', 'Chếch phải'],
    'sharp left': ['↰', 'Rẽ ngoặt trái'],
    'sharp right': ['↱', 'Rẽ ngoặt phải'],
    uturn: ['↶', 'Quay đầu'],
  };

  if (type === 'arrive') {
    return { icon: '⚑', text: 'Đi tới điểm đến' };
  }

  if (type === 'roundabout' || type === 'rotary') {
    const exit =
      typeof maneuver.exit === 'number' &&
      Number.isInteger(maneuver.exit) &&
      maneuver.exit > 0
        ? maneuver.exit
        : null;

    return {
      icon: '↻',
      text:
        'Vào vòng xuyến' +
        `${exit ? `, ra tại lối thứ ${exit}` : ''}${suffix}`,
    };
  }

  if (type === 'exit roundabout' || type === 'exit rotary') {
    return {
      icon: '↗',
      text: `Ra khỏi vòng xuyến${suffix}`,
    };
  }

  if (type === 'merge') {
    return { icon: '↗', text: `Nhập làn${suffix}` };
  }

  if (type === 'fork') {
    const side = modifier.includes('left')
      ? 'trái'
      : modifier.includes('right')
        ? 'phải'
        : 'thẳng';

    return {
      icon: side === 'trái' ? '↖' : side === 'phải' ? '↗' : '↑',
      text: `Đi theo nhánh ${side}${suffix}`,
    };
  }

  if (type === 'off ramp') {
    return {
      icon: turns[modifier]?.[0] ?? '↗',
      text: `Đi theo lối ra${suffix}`,
    };
  }

  if (type === 'on ramp') {
    return {
      icon: turns[modifier]?.[0] ?? '↗',
      text: `Đi theo đường dẫn${suffix}`,
    };
  }

  const turn = turns[modifier];

  if (turn) {
    return { icon: turn[0], text: `${turn[1]}${suffix}` };
  }

  return {
    icon: '↑',
    text: road ? `Tiếp tục theo ${road}` : 'Tiếp tục đi thẳng',
  };
}

export function buildNavigation(value: unknown): NavigationRoute {
  const root = record(value);

  if (
    root.code !== 'Ok' ||
    !Array.isArray(root.routes) ||
    !root.routes[0]
  ) {
    throw new Error('Chưa nhận được tuyến có chỉ dẫn.');
  }

  const route = record(root.routes[0]);

  if (!Array.isArray(route.legs) || !route.legs.length) {
    throw new Error('Tuyến chưa có các bước chỉ dẫn.');
  }

  const points: NavPoint[] = [];
  const cumulative: number[] = [];
  const steps: Step[] = [];
  let length = 0;

  for (const rawLeg of route.legs) {
    const leg = record(rawLeg);

    if (!Array.isArray(leg.steps) || !leg.steps.length) {
      throw new Error('Thiếu bước rẽ. Hãy tính lại tuyến.');
    }

    for (const rawStep of leg.steps) {
      const step = record(rawStep);
      const geometry = record(step.geometry);

      if (
        geometry.type !== 'LineString' ||
        !Array.isArray(geometry.coordinates) ||
        !geometry.coordinates.length ||
        !geometry.coordinates.every(isPoint)
      ) {
        throw new Error('Hình học bước rẽ không hợp lệ.');
      }

      const coordinates = geometry.coordinates as NavPoint[];
      const previous = points[points.length - 1];

      if (previous && distance(previous, coordinates[0]) > 50) {
        throw new Error('Các bước chỉ dẫn không nối liền nhau.');
      }

      for (let i = 0; i < coordinates.length; i++) {
        const point = coordinates[i];
        const last = points[points.length - 1];
        const segment = last ? distance(last, point) : 0;

        if (!last || segment > 0.05) {
          length += segment;
          points.push([point[0], point[1]]);
          cumulative.push(length);
        }

        if (i === 0) {
          steps.push({ at: length, ...instruction(step) });
        }
      }
    }
  }

  if (points.length < 2 || steps.length < 2 || length < 1) {
    throw new Error('Tuyến quá ngắn hoặc thiếu chỉ dẫn.');
  }

  return { points, cumulative, steps, length };
}

function projection(point: NavPoint, a: NavPoint, b: NavPoint) {
  const xScale = 111320 * Math.cos(point[1] * Math.PI / 180);
  const ax = (a[0] - point[0]) * xScale;
  const ay = (a[1] - point[1]) * 111320;
  const bx = (b[0] - point[0]) * xScale;
  const by = (b[1] - point[1]) * 111320;
  const dx = bx - ax;
  const dy = by - ay;

  const t = Math.max(
    0,
    Math.min(
      1,
      -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1),
    ),
  );

  return {
    t,
    distance: Math.hypot(ax + t * dx, ay + t * dy),
  };
}

export class TurnNavigator {
  private route: NavigationRoute;
  private walking: boolean;
  private progress = 0;
  private lastFix: NavFix | null = null;
  private lastSeen = -1;
  private outside = 0;
  private last: TurnGuidance | null = null;
  private directionConfirmed = false;

  private startup: {
    fix: NavFix;
    at: number;
    samples: number;
  } | null = null;

  constructor(route: NavigationRoute, walking: boolean) {
    this.route = route;
    this.walking = walking;
  }

  update(fix: NavFix, now = Date.now()): TurnGuidance {
    const warning = (
      status: TurnGuidance['status'],
      text: string,
    ): TurnGuidance => ({
      status,
      text,
      icon: '!',
      turnMeters: null,
      remainingMeters: null,
    });

    if (
      !isPoint(fix.point) ||
      fix.accuracy === null ||
      !Number.isFinite(fix.accuracy) ||
      fix.accuracy < 0 ||
      fix.accuracy > 35 ||
      !Number.isFinite(fix.timestamp) ||
      Math.abs(now - fix.timestamp) > 15000
    ) {
      if (!this.directionConfirmed) this.startup = null;

      return warning(
        'weak',
        'GPS yếu hoặc đã cũ. Đang chờ vị trí chính xác hơn.',
      );
    }

    if (fix.timestamp <= this.lastSeen && this.last) {
      return this.last;
    }

    this.lastSeen = fix.timestamp;

    const speed = this.walking ? 4 : 55;
    const dt = this.lastFix
      ? (fix.timestamp - this.lastFix.timestamp) / 1000
      : 0;

    if (
      this.lastFix &&
      dt > 0 &&
      distance(fix.point, this.lastFix.point) > speed * dt + 70
    ) {
      this.last = warning(
        'weak',
        'GPS vừa nhảy vị trí. Đang chờ vị trí ổn định.',
      );
      return this.last;
    }

    const maxAhead = this.lastFix
      ? Math.max(
          60,
          speed * Math.min(30, Math.max(0, dt)) +
            fix.accuracy * 2,
        )
      : this.walking
        ? 200
        : 1500;

    let nearest = Infinity;
    let bestScore = Infinity;
    let best: { at: number; distance: number } | null = null;

    for (let i = 1; i < this.route.points.length; i++) {
      const candidate = projection(
        fix.point,
        this.route.points[i - 1],
        this.route.points[i],
      );

      nearest = Math.min(nearest, candidate.distance);

      const start = this.route.cumulative[i - 1];
      const at =
        start +
        candidate.t * (this.route.cumulative[i] - start);

      if (
        at < this.progress - 35 ||
        at > this.progress + maxAhead
      ) {
        continue;
      }

      const score =
        candidate.distance + Math.abs(at - this.progress) * 0.02;

      if (score < bestScore) {
        bestScore = score;
        best = { at, distance: candidate.distance };
      }
    }

    const tolerance = Math.max(30, fix.accuracy * 1.5);

    if (nearest > tolerance) {
      this.outside += 1;

      this.last =
        this.outside >= 3
          ? warning(
              'off-route',
              'Bạn có thể đã lệch tuyến. Hãy chọn tính lại tuyến.',
            )
          : warning(
              'uncertain',
              'Vị trí đang xa tuyến. Đang kiểm tra thêm GPS.',
            );

      return this.last;
    }

    this.outside = 0;

    if (
      !best ||
      best.distance > tolerance ||
      best.at < this.progress - 20
    ) {
      this.last = warning(
        'uncertain',
        'Chưa xác định được tiến trình trên tuyến. Hãy tính lại nếu đã đổi đường.',
      );
      return this.last;
    }

    if (!this.directionConfirmed) {
      if (
        fix.accuracy > 25 ||
        best.distance > Math.max(12, fix.accuracy)
      ) {
        this.startup = null;
        this.last = warning(
          'uncertain',
          'Chưa khớp chắc vị trí xuất phát với tuyến. Đang chờ GPS chính xác hơn.',
        );
        return this.last;
      }

      this.lastFix = fix;

      if (!this.startup) {
        this.startup = { fix, at: best.at, samples: 1 };
        this.progress = best.at;
      } else {
        this.startup.samples += 1;
      }

      const start = this.startup;
      const elapsed = fix.timestamp - start.fix.timestamp;
      const moved = distance(start.fix.point, fix.point);
      const required = Math.max(
        12,
        (start.fix.accuracy ?? 25) + fix.accuracy,
      );
      const forward = best.at - start.at;

      if (
        start.samples < 3 ||
        elapsed < 4000 ||
        moved < required ||
        forward < required
      ) {
                this.last = warning(
          forward < -required ? 'uncertain' : 'starting',
          forward < -required
            ? 'Chuyển động chưa khớp chiều tuyến dự kiến. Hãy kiểm tra tuyến hoặc tính lại.'
            : 'Đang xác định hướng di chuyển',
        );
        return this.last;
      }

      this.directionConfirmed = true;
      this.startup = null;
    }

    this.progress = Math.max(this.progress, best.at);
    this.lastFix = fix;

    let next = 1;

    while (
      next < this.route.steps.length - 1 &&
      this.progress > this.route.steps[next].at + 5
    ) {
      next += 1;
    }

    const step = this.route.steps[next];
    const remaining = Math.max(
      0,
      this.route.length - this.progress,
    );

    const near =
      remaining <= 35 &&
      distance(
        fix.point,
        this.route.points[this.route.points.length - 1],
      ) <= 35;

    this.last = {
      status: near ? 'near' : 'ok',
      icon: near ? '⚑' : step.icon,
      text: near
        ? 'Bạn đang gần điểm đến. Hãy kiểm tra và xác nhận check-in.'
        : step.text,
      turnMeters: near
        ? 0
        : Math.max(0, Math.round(step.at - this.progress)),
      remainingMeters: Math.round(remaining),
    };

    return this.last;
  }
}