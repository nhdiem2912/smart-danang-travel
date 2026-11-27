export type HomeWeather = {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
  uv: number | null;
  updated: string;
  observedAt: string;
  fetchedAt: string;
  date: string;

  days: {
    date: string;
    low: number;
    high: number;
    rain: number | null;
    icon: string;
    description: string;
  }[];

  hours: {
    timestamp: string;
    time: string;
    temperature: number;
    rain: number | null;
    icon: string;
  }[];
};

function condition(code: number): [string, string] {
  if (code === 0) return ['Trời quang', '☀'];
  if (code <= 3) return ['Có mây', '⛅'];
  if (code <= 48) return ['Sương mù', '☁'];
  if (code <= 67) return ['Có mưa', '🌧'];
  if (code <= 77) return ['Có hạt băng', '☁'];
  if (code <= 82) return ['Mưa rào', '🌦'];

  return ['Có dông', '⛈'];
}

export async function loadHomeWeather(
  signal: AbortSignal,
): Promise<HomeWeather> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=16.0544&longitude=108.2022' +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&hourly=temperature_2m,precipitation_probability,weather_code,uv_index' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=Asia%2FHo_Chi_Minh&forecast_days=7';

  const response = await fetch(url, { signal, cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Chưa tải được thời tiết');
  }

  return parseHomeWeather(await response.json());
}

export function parseHomeWeather(
  data: Record<string, any>,
  now = Date.now(),
): HomeWeather {
  const today = new Date(now + 7 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const current = data?.current;
  const daily = data?.daily;
  const hourly = data?.hourly;

  if (
    !current ||
    typeof current.time !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(current.time) ||
    !Number.isFinite(Date.parse(current.time + '+07:00')) ||
    ![
      current.temperature_2m,
      current.relative_humidity_2m,
      current.weather_code,
      current.wind_speed_10m,
    ].every(Number.isFinite) ||
    !Array.isArray(daily?.time) ||
    !daily.time.length ||
    !Array.isArray(hourly?.time) ||
    !hourly.time.length
  ) {
    throw new Error('Dữ liệu thời tiết chưa hợp lệ');
  }

  const number = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : null;

  const days = daily.time.slice(0, 7).map(
    (date: unknown, index: number) => {
      const low = number(daily.temperature_2m_min?.[index]);
      const high = number(daily.temperature_2m_max?.[index]);
      const code = number(daily.weather_code?.[index]);

      if (
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        low === null ||
        high === null ||
        code === null
      ) {
        throw new Error('Thiếu dữ liệu dự báo');
      }

      const [description, icon] = condition(code);

      return {
        date,
        low,
        high,
        description,
        icon,
        rain: number(
          daily.precipitation_probability_max?.[index],
        ),
      };
    },
  );

  const hours = hourly.time.flatMap(
    (time: unknown, index: number) => {
      if (typeof time !== 'string' || time.slice(0, 10) !== today) return [];
      const temperature = number(
        hourly.temperature_2m?.[index],
      );
      const code = number(hourly.weather_code?.[index]);

      if (
        typeof time !== 'string' ||
        !/T(?:[01]\d|2[0-3]):00$/.test(time) ||
        temperature === null ||
        code === null
      ) {
        throw new Error('Thiếu dự báo theo giờ');
      }

      return [{
        timestamp: time + '+07:00',
        time: time.slice(11, 16),
        temperature,
        icon: condition(code)[1],
        rain: number(
          hourly.precipitation_probability?.[index],
        ),
      }];
    },
  );

  if (hours.length !== 24 || new Set(hours.map((hour: HomeWeather['hours'][number]) => hour.time)).size !== 24 || !days.some((day: HomeWeather['days'][number]) => day.date === today)) {
    throw new Error('Thiếu dự báo trong ngày');
  }

  const currentHour = hourly.time.findIndex(
    (time: string) =>
      time === current.time.slice(0, 13) + ':00',
  );

  const uv =
    currentHour < 0
      ? null
      : hourly.uv_index?.[currentHour];

  const [description, icon] = condition(
    current.weather_code,
  );

  return {
    temperature: Math.round(current.temperature_2m),
    description,
    icon,
    humidity: Math.round(current.relative_humidity_2m),
    wind: Math.round(current.wind_speed_10m),
    uv:
      typeof uv === 'number' && Number.isFinite(uv)
        ? uv
        : null,
    updated: current.time.slice(11, 16),
    observedAt: current.time + '+07:00',
    fetchedAt: new Date(now).toISOString(),
    date: today,
    days: days.filter((day: HomeWeather['days'][number]) => day.date >= today),
    hours,
  };
}