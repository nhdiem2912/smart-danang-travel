type Span = [number, number];
type Week = (Span[] | null)[];

const NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday',
];

const SHORT = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];

function minute(raw: string): number | null {
  const match = raw.trim().match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const suffix = match[3]?.toUpperCase();

  if (
    minutes > 59 ||
    (
      suffix
        ? hour < 1 || hour > 12
        : hour > 24 || (hour === 24 && minutes !== 0)
    )
  ) {
    return null;
  }

  if (suffix) {
    hour = hour % 12 + (suffix === 'PM' ? 12 : 0);
  }

  return hour * 60 + minutes;
}

function spans(value: unknown): Span[] | null {
  const values = Array.isArray(value) ? value : [value];

  if (!values.length) return [];

  const result: Span[] = [];

  for (const value of values) {
    if (typeof value !== 'string') return null;

    const text = value.trim();

    if (/^(closed|off|đóng cửa)$/i.test(text)) continue;

    if (
      /^(24\/7|open 24 hours|24 hours|mở cửa 24 giờ)$/i.test(text)
    ) {
      result.push([0, 1440]);
      continue;
    }

    for (const part of text.split(/[,;]/)) {
      const pair = part.split(/\s*[-–—−]\s*/);

      if (pair.length !== 2) return null;

      const start = minute(pair[0]);
      const end = minute(pair[1]);

      if (
        start === null ||
        end === null ||
        start === 1440
      ) {
        return null;
      }

      result.push([
        start,
        end <= start ? end + 1440 : end,
      ]);
    }
  }

  return result;
}

function week(raw: string): Week | null {
  const text = raw.trim();

  if (text.startsWith('{')) {
    let object: Record<string, unknown>;

    try {
      const parsed: unknown = JSON.parse(text);

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return null;
      }

      object = parsed as Record<string, unknown>;
    } catch {
      object = {};

      const pattern =
        /["'](Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)["']\s*:\s*\[([^\]]*)\]/g;

      for (const match of text.matchAll(pattern)) {
        object[match[1]] = Array.from(
          match[2].matchAll(/["']([^"']*)["']/g),
          item => item[1],
        );
      }

      if (!Object.keys(object).length) return null;
    }

    return NAMES.map(name =>
      Object.hasOwn(object, name)
        ? spans(object[name])
        : null,
    );
  }

  const everyDay = spans(text);

  if (everyDay) {
    return NAMES.map(() => everyDay);
  }

  const output: Week = NAMES.map(() => []);

  for (const rule of text.split(';')) {
    const match = rule.trim().match(
      /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*[-,]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(.+)$/i,
    );

    if (!match) return null;

    const values = spans(match[2]);

    if (!values) return null;

    const indices = new Set<number>();

    for (
      const selector of match[1].toLowerCase().split(',')
    ) {
      const pair = selector
        .split('-')
        .map(part => SHORT.indexOf(part.trim()));

      if (pair.some(index => index < 0)) return null;

      let index = pair[0];
      const last = pair[1] ?? pair[0];

      for (
        let count = 0;
        count < 7;
        count++, index = (index + 1) % 7
      ) {
        indices.add(index);
        if (index === last) break;
      }
    }

    for (const index of indices) {
      output[index] = values;
    }
  }

  return output;
}

export type VenueNotice = {
  kind: 'closing' | 'blocked';
  message: string;
  closesAt: string | null;
};

export function venueNotice(
  raw: string | null | undefined,
  nowMs: number,
  travelSeconds: number,
  visitMinutes: number,
): VenueNotice | null {
  // Theo yêu cầu: thiếu dữ liệu thì tạm coi mở cả ngày.
  if (!raw?.trim()) return null;

  const schedule = week(raw);

  if (!schedule) {
    return {
      kind: 'blocked',
      closesAt: null,
      message:
        'Chưa đọc được giờ mở cửa. Cần cập nhật dữ liệu hoặc chọn địa điểm khác.',
    };
  }

  const arrivalMs = nowMs + travelSeconds * 1000;
  const local = new Date(arrivalMs + 7 * 3600000);
  const day = (local.getUTCDay() + 6) % 7;

  const midnight =
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    ) -
    7 * 3600000;

  const ranges: Span[] = [];

  for (let offset = -1; offset <= 2; offset++) {
    const values =
      schedule[(day + offset + 7) % 7];

    for (const [start, end] of values || []) {
      ranges.push([
        midnight + offset * 86400000 + start * 60000,
        midnight + offset * 86400000 + end * 60000,
      ]);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);

  const merged: Span[] = [];

  for (const range of ranges) {
    const previous = merged[merged.length - 1];

    if (previous && range[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }

  const opening = merged.find(
    ([start, end]) =>
      arrivalMs >= start && arrivalMs < end,
  );

  if (!opening) {
    return {
      kind: 'blocked',
      closesAt: null,
      message:
        schedule[day] === null
          ? 'Chưa có giờ mở cửa cho ngày dự kiến đến. Cần cập nhật dữ liệu giờ.'
          : 'Giờ dự kiến đến nằm ngoài giờ mở cửa. Bạn có thể bỏ qua địa điểm hoặc quay lại kế hoạch.',
    };
  }

  const minutesUntilClosing = Math.ceil(
    (opening[1] - nowMs) / 60000,
  );

  const availableMinutes = Math.max(
    0,
    Math.floor((opening[1] - arrivalMs) / 60000),
  );

  if (
    minutesUntilClosing > 60 &&
    availableMinutes >= visitMinutes
  ) {
    return null;
  }

  return {
    kind: 'closing',
    closesAt: new Date(opening[1]).toISOString(),
    message:
      `Địa điểm còn khoảng ${minutesUntilClosing} phút nữa đóng cửa. ` +
      `Dự kiến di chuyển ${Math.ceil(travelSeconds / 60)} phút, ` +
      `còn khoảng ${availableMinutes} phút tham quan. ` +
      `Thời gian dừng dự kiến của bạn là ${visitMinutes} phút. ` +
      'Bạn có muốn tiếp tục?',
  };
}

// Giữ tương thích nếu còn nơi gọi hàm này.
export function assertVenueVisit(
  raw: string | null | undefined,
  arrivalMs: number,
  visitMinutes: number,
) {
  const notice = venueNotice(
    raw,
    arrivalMs,
    0,
    visitMinutes,
  );

  if (notice?.kind === 'blocked') {
    throw new Error(notice.message);
  }
}
export function venueWindows(
  raw: string | null | undefined,
  date: string,
): [number, number][] {
  if (!raw?.trim()) return [[0, 1440]];

  const schedule = week(raw);
  const local = new Date(`${date}T12:00:00+07:00`);

  if (!schedule || !Number.isFinite(local.getTime())) {
    throw new Error(
      'Chưa đọc được giờ mở cửa. Cần cập nhật dữ liệu địa điểm.',
    );
  }

  const day =
    (
      new Date(local.getTime() + 7 * 3600000).getUTCDay() +
      6
    ) % 7;

  if (schedule[day] === null) {
    throw new Error(
      'Chưa có giờ mở cửa cho ngày đã chọn.',
    );
  }

  const ranges: [number, number][] = [];

  for (const offset of [-1, 0]) {
    const values =
      schedule[(day + offset + 7) % 7] ?? [];

    for (const [start, end] of values) {
      const a = Math.max(
        0,
        start + offset * 1440,
      );

      const b = Math.min(
        1440,
        end + offset * 1440,
      );

      if (a < b) ranges.push([a, b]);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];

  for (const [a, b] of ranges) {
    const last = merged[merged.length - 1];

    if (last && a <= last[1]) {
      last[1] = Math.max(last[1], b);
    } else {
      merged.push([a, b]);
    }
  }

  return merged;
}