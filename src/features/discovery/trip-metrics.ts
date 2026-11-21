import type {
    LegCheckpoint,
    LegResult,
    TravelMode,
} from './trip-model';

type Sample = {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
};

export function formatTravelTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));

  if (total < 60) return `${total} giây`;

  const minutes = Math.floor(total / 60);

  return minutes < 60
    ? `${minutes} phút ${total % 60} giây`
    : `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

export function assertLegResult(
  value: unknown,
): asserts value is LegResult {
  const result = value as LegResult | null;

  const nonNegative = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0;

  const validDate = (v: unknown) =>
    typeof v === 'string' && Number.isFinite(Date.parse(v));

  if (
    !result ||
    result.version !== 1 ||
    !validDate(result.startedAt) ||
    !validDate(result.arrivedAt) ||
    Date.parse(result.arrivedAt) < Date.parse(result.startedAt) ||
    !['driving', 'walking'].includes(result.travelMode) ||
    !nonNegative(result.activeSeconds) ||
    !(result.gpsMeters === null || nonNegative(result.gpsMeters)) ||
    !nonNegative(result.plannedMeters) ||
    !nonNegative(result.plannedSeconds) ||
    typeof result.gpsPartial !== 'boolean'
  ) {
    throw new Error(
      'Kết quả chặng không hợp lệ. Dữ liệu cũ được giữ nguyên.',
    );
  }
}

export class LegTracker {
  private runningSince: number | null = null;
  private elapsed = 0;
  private startedAt: string | null = null;
  private previous: Sample | null = null;
  private meters = 0;
  private pairs = 0;
  private partial = false;
  private clock: () => number;

    constructor(clock: () => number = () => performance.now()) {
    this.clock = clock;
  }

  checkpoint(): LegCheckpoint {
    const current =
      this.runningSince === null
        ? 0
        : Math.max(0, this.clock() - this.runningSince);

    return {
      startedAt: this.startedAt,
      elapsedMs: this.elapsed + current,
      meters: this.meters,
      pairs: this.pairs,
      partial: this.partial || this.runningSince !== null,
    };
  }

  restore(value: LegCheckpoint) {
    this.startedAt = value.startedAt;
    this.elapsed = value.elapsedMs;
    this.meters = value.meters;
    this.pairs = value.pairs;
    this.partial = true;
    this.runningSince = null;
    this.previous = null;
  }

  resume() {
    if (this.runningSince !== null) return;

    this.startedAt ??= new Date().toISOString();
    this.runningSince = this.clock();
    this.previous = null;
  }

  pause() {
    if (this.runningSince !== null) {
      this.elapsed += Math.max(0, this.clock() - this.runningSince);
      this.runningSince = null;
      this.partial = true;
    }

    this.previous = null;
  }

  seconds() {
    const current =
      this.runningSince === null
        ? 0
        : Math.max(0, this.clock() - this.runningSince);

    return Math.floor((this.elapsed + current) / 1000);
  }

  gpsMeters(): number | null {
    return this.pairs > 0 ? Math.round(this.meters) : null;
  }

  sample(sample: Sample, mode: TravelMode) {
    if (this.runningSince === null) return;

    const { latitude, longitude, accuracy } = sample.coords;

    if (
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180 ||
      accuracy === null ||
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 35 ||
      !Number.isFinite(sample.timestamp) ||
      Math.abs(Date.now() - sample.timestamp) > 15000
    ) {
      this.previous = null;
      this.partial = true;
      return;
    }

    const previous = this.previous;

    if (!previous) {
      this.previous = sample;
      return;
    }

    const seconds = (sample.timestamp - previous.timestamp) / 1000;

    if (seconds <= 0) return;

    if (seconds > 30) {
      this.previous = sample;
      this.partial = true;
      return;
    }

    const radians = Math.PI / 180;
    const a = previous.coords;

    const h =
      Math.sin((latitude - a.latitude) * radians / 2) ** 2 +
      Math.cos(latitude * radians) *
        Math.cos(a.latitude * radians) *
        Math.sin((longitude - a.longitude) * radians / 2) ** 2;

    const meters =
      6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));

    // Loại bước nhảy GPS có tốc độ không hợp lý.
    if (meters / seconds > (mode === 'walking' ? 4 : 55)) {
      this.previous = null;
      this.partial = true;
      return;
    }

    this.pairs += 1;

    const threshold = Math.max(
      5,
      (accuracy + (a.accuracy ?? accuracy)) / 2,
    );

    // Giữ mốc khi dao động nhỏ để cộng dồn chuyển động ngắn.
    if (meters >= threshold) {
      this.meters += meters;
      this.previous = sample;
    }
  }

  result(
    mode: TravelMode,
    plannedMeters: number,
    plannedSeconds: number,
  ): LegResult {
    if (!this.startedAt || mode === 'two_wheeler') {
      throw new Error('Chưa bắt đầu đo chặng hợp lệ.');
    }

    const result: LegResult = {
      version: 1,
      startedAt: this.startedAt,
      arrivedAt: new Date().toISOString(),
      travelMode: mode,
      activeSeconds: this.seconds(),
      gpsMeters: this.gpsMeters(),
      gpsPartial: this.partial || this.pairs === 0,
      plannedMeters,
      plannedSeconds,
    };

    assertLegResult(result);
    return result;
  }
}