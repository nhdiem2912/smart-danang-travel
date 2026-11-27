const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const EMPTY_DATE = '—';

const twoDigits = (value: number) => String(value).padStart(2, '0');

/** Format a stored YYYY-MM-DD calendar date without shifting its day. */
export function formatVietnameseDate(value: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!parts) return EMPTY_DATE;

  const date = new Date(`${value}T00:00:00Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return EMPTY_DATE;
  }

  return `${parts[3]}/${parts[2]}/${parts[1]}`;
}

/** Format an instant as DD/MM/YYYY HH:mm in Vietnam, regardless of device locale. */
export function formatVietnameseDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return EMPTY_DATE;

  const vietnam = new Date(timestamp + VIETNAM_OFFSET_MS);
  const date = [
    twoDigits(vietnam.getUTCDate()),
    twoDigits(vietnam.getUTCMonth() + 1),
    String(vietnam.getUTCFullYear()).padStart(4, '0'),
  ].join('/');
  const time = [
    twoDigits(vietnam.getUTCHours()),
    twoDigits(vietnam.getUTCMinutes()),
  ].join(':');

  return `${date} ${time}`;
}
