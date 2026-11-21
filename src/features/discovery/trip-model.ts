export const PERIODS = [
  { id: 'morning', label: 'Buổi sáng', icon: '🌅' },
  { id: 'noon', label: 'Buổi trưa', icon: '☀️' },
  { id: 'afternoon', label: 'Buổi chiều', icon: '🌤️' },
  { id: 'evening', label: 'Buổi tối', icon: '🌙' },
] as const;

export type Period = (typeof PERIODS)[number]['id'];

export type TravelMode =
  | 'two_wheeler'
  | 'driving'
  | 'walking';

export type LegResult = {
  version: 1;
  startedAt: string;
  arrivedAt: string;
  travelMode: 'driving' | 'walking';
  activeSeconds: number;
  gpsMeters: number | null;
  gpsPartial: boolean;
  plannedMeters: number;
  plannedSeconds: number;
};

export type TripReview = {
  rating: number;
  note: string;
  submittedAt: string;
};
export const PERIOD_WINDOWS: Record<
  Period,
  { start: number; end: number; label: string }
> = {
  morning: {
    start: 6 * 60 + 30,
    end: 11 * 60 + 30,
    label: '06:30–11:30',
  },
  noon: {
    start: 11 * 60 + 30,
    end: 14 * 60,
    label: '11:30–14:00',
  },
  afternoon: {
    start: 14 * 60,
    end: 18 * 60,
    label: '14:00–18:00',
  },
  evening: {
    start: 18 * 60,
    end: 22 * 60 + 30,
    label: '18:00–22:30',
  },
};

export type StopSchedule = {
  departureMinute: number;
  arrivalMinute: number;
  visitStartMinute: number;
  endMinute: number;
  travelSeconds: number;
  travelMeters: number;
  bufferMinutes: number;
  visitMinutes: number;
  requestedVisitMinutes: number;
};

export function timeToMinute(value: string): number {
  const [hour, minute] = value.split(':').map(Number);

  return hour * 60 + minute;
}

export function minuteToTime(value: number): string {
  const minute = Math.round(value);

  return (
    String(Math.floor(minute / 60)).padStart(2, '0') +
    ':' +
    String(minute % 60).padStart(2, '0')
  );
}

export type LegCheckpoint = {
  startedAt: string | null;
  elapsedMs: number;
  meters: number;
  pairs: number;
  partial: boolean;
};

export type LegProgress = {
  id: string;
  travelMode: 'driving' | 'walking';
  savedAt: string;
  checkpoint: LegCheckpoint;
};

export type DraftStop = {
  id: string;
  placeId: string;
  dayIndex: number;
  period: Period;
  note: string;
  order: number;
  visitMinutes: number | null;
  completed: boolean;
  result?: LegResult;
  previousResults?: LegResult[];
  progress?: LegProgress;
  orderLocked?: boolean;
  schedule?: StopSchedule;
};

export type TripSettings = {
  startLabel: string;
  latitude: number | null;
  longitude: number | null;
  startTime: string;
  endTime: string;
  travelMode: TravelMode;
  defaultVisitMinutes: number;
};

export type TripPlan = {
  version: 1;
  createdAt: string;
  signature: string;
  entries: Record<string, StopSchedule>;
};

export type TripDraft = {
  version: 1;
  id: string;
  startDate: string;
  dayCount: number;
  stops: DraftStop[];
  settings: TripSettings;
  updatedAt: string;
  review?: TripReview;
    plan?: TripPlan;
};

export function localISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    localISO(date) === value
  );
}

export function dateForDay(
  startDate: string,
  dayIndex: number,
): string {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + dayIndex);

  return localISO(date);
}

export function displayDate(value: string): string {
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
}

export function sortedStops(stops: DraftStop[]): DraftStop[] {
  const periodIndex = (period: Period) =>
    PERIODS.findIndex(item => item.id === period);

  return [...stops].sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      periodIndex(a.period) - periodIndex(b.period) ||
      a.order - b.order ||
      a.id.localeCompare(b.id),
  );
}

export function emptyDraft(): TripDraft {
  return {
    version: 1,
    id: 'local-trip',
    startDate: localISO(),
    dayCount: 3,
    stops: [],
    settings: {
      startLabel: 'Vị trí hiện tại của bạn',
      latitude: null,
      longitude: null,
      startTime: '09:00',
      endTime: '18:30',
      travelMode: 'two_wheeler',

      // Giá trị ước tính, người dùng có thể chỉnh sau.
      defaultVisitMinutes: 60,
    },
    updatedAt: new Date().toISOString(),
  };
}