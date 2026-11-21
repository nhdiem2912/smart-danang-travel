const DAYS = [
  ['Monday', 'Thứ Hai'],
  ['Tuesday', 'Thứ Ba'],
  ['Wednesday', 'Thứ Tư'],
  ['Thursday', 'Thứ Năm'],
  ['Friday', 'Thứ Sáu'],
  ['Saturday', 'Thứ Bảy'],
  ['Sunday', 'Chủ nhật'],
] as const;

export type HoursRow = {
  day: string;
  hours: string;
};

function clock(text: string): string | null {
  const match = text.trim().match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = match[3]?.toUpperCase();

  if (
    minute > 59 ||
    (
      suffix
        ? hour < 1 || hour > 12
        : hour > 24 || (hour === 24 && minute !== 0)
    )
  ) {
    return null;
  }

  if (suffix) {
    hour = hour % 12 + (suffix === 'PM' ? 12 : 0);
  }

  return (
    `${String(hour).padStart(2, '0')}:` +
    String(minute).padStart(2, '0')
  );
}

function formatValue(value: unknown): string | null {
  const items = Array.isArray(value) ? value : [value];

  if (!items.length) return null;

  const formatted: string[] = [];

  for (const item of items) {
    if (typeof item !== 'string') return null;

    const text = item.trim();

    if (
      /^(open 24 hours|24 hours|24\/7|mở cửa 24 giờ)$/i.test(text)
    ) {
      formatted.push('Mở cửa 24 giờ');
      continue;
    }

    if (/^(closed|off|đóng cửa)$/i.test(text)) {
      formatted.push('Đóng cửa');
      continue;
    }

    for (const range of text.split(/[,;]/)) {
      const pair = range.split(/\s*[-–—−]\s*/);

      if (pair.length !== 2) return null;

      const start = clock(pair[0]);
      const end = clock(pair[1]);

      if (!start || !end) return null;

      formatted.push(`${start} – ${end}`);
    }
  }

  return formatted.join(' · ');
}

export function openingHours(
  raw: string | null | undefined,
): {
  summary: string;
  rows: HoursRow[];
} {
  const empty = {
    summary: 'Chưa cập nhật giờ mở cửa',
    rows: [] as HoursRow[],
  };

  if (!raw?.trim()) return empty;

  const text = raw.trim();
  let object: Record<string, unknown> | null = null;

  if (text.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(text);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        object = parsed as Record<string, unknown>;
      }
    } catch {
      // Đọc dữ liệu dùng dấu nháy đơn, không thực thi nội dung.
      const found: Record<string, unknown> = {};

      const pattern =
        /["'](Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)["']\s*:\s*\[([^\]]*)\]/g;

      for (const match of text.matchAll(pattern)) {
        found[match[1]] = Array.from(
          match[2].matchAll(/["']([^"']*)["']/g),
          part => part[1],
        );
      }

      if (Object.keys(found).length) {
        object = found;
      }
    }
  }

  if (object) {
    const rows = DAYS
      .filter(([key]) => Object.hasOwn(object, key))
      .map(([key, day]) => ({
        day,
        hours: formatValue(object[key]) || 'Chưa cập nhật',
      }));

    if (!rows.length) return empty;

    const same =
      rows.length === 7 &&
      rows.every(row => row.hours === rows[0].hours) &&
      rows[0].hours !== 'Chưa cập nhật';

    return {
      summary: same
        ? `${rows[0].hours} · Hằng ngày`
        : 'Xem lịch mở cửa',
      rows,
    };
  }

  const daily = formatValue(
    text.replace(/^Mo-Su\s+/, ''),
  );

  return daily
    ? {
        summary: `${daily} · Hằng ngày`,
        rows: [
          {
            day: 'Hằng ngày',
            hours: daily,
          },
        ],
      }
    : empty;
}