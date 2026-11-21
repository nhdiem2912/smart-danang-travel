import AsyncStorage from '@react-native-async-storage/async-storage';

export type AddressResult = {
  id: string;
    title: string;
  subtitle: string;
  isAddress: boolean;
  label: string;
  latitude: number;
  longitude: number;
  houseNumber: string | null;
};

const ENDPOINT_KEY =
  '@smart-danang-travel/address-endpoint:v1';

const DEFAULT_ENDPOINT =
  'https://nominatim.openstreetmap.org/search';

const cache = new Map<string, AddressResult[]>();

let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

export async function setAddressSearchEndpoint(
  endpoint: string,
) {
  if (!endpoint.startsWith('https://')) {
    throw new Error('Nguồn địa chỉ phải dùng HTTPS.');
  }

  await AsyncStorage.setItem(ENDPOINT_KEY, endpoint);
  cache.clear();
}

export function requestedHouseNumber(
  query: string,
): string | null {
  return (
    query.trim().match(
      /^(\d+[a-zA-Z]?(?:[\/-]\d+[a-zA-Z]?)*)(?=\s|,|$)/,
    )?.[1] ?? null
  );
}

export function searchAddresses(
  query: string,
): Promise<AddressResult[]> {
  const trimmed = query.trim();

  if (trimmed.length < 3) {
    return Promise.reject(
      new Error('Nhập ít nhất 3 ký tự.'),
    );
  }

  const task = queue.then(async () => {
    let endpoint = DEFAULT_ENDPOINT;

    try {
      endpoint =
        (await AsyncStorage.getItem(ENDPOINT_KEY)) ||
        DEFAULT_ENDPOINT;
    } catch {}

    const key = `${endpoint}:${trimmed.toLowerCase()}`;
    const hit = cache.get(key);

    if (hit) return hit;

    const wait = Math.max(
      0,
      1100 - (Date.now() - lastRequest),
    );

    if (wait) {
      await new Promise<void>(resolve =>
        setTimeout(resolve, wait),
      );
    }

    lastRequest = Date.now();

    const params = new URLSearchParams({
      q: trimmed,
      format: 'jsonv2',
      addressdetails: '1',
            namedetails: '1',
      limit: '8',
      countrycodes: 'vn',
      'accept-language': 'vi',
      viewbox: '107.7,16.5,108.8,15.5',
      bounded: '1',
    });

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      15000,
    );

    try {
      const response = await fetch(
        `${endpoint}?${params.toString()}`,
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'SmartDaNangTravel/1.0',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'Nguồn địa chỉ đang giới hạn yêu cầu. Đợi rồi thử lại.'
            : `Không tìm được địa chỉ: HTTP ${response.status}.`,
        );
      }

      const raw: unknown = await response.json();

      if (!Array.isArray(raw)) {
        throw new Error(
          'Kết quả địa chỉ không hợp lệ.',
        );
      }

      const result: AddressResult[] = [];

      for (
        const item of raw as Record<string, unknown>[]
      ) {
        if (
          !item ||
          typeof item !== 'object' ||
          typeof item.display_name !== 'string' ||
          typeof item.lat !== 'string' ||
          typeof item.lon !== 'string'
        ) {
          continue;
        }

        const latitude = Number(item.lat);
        const longitude = Number(item.lon);

        if (
          !Number.isFinite(latitude) ||
          Math.abs(latitude) > 90 ||
          !Number.isFinite(longitude) ||
          Math.abs(longitude) > 180
        ) {
          continue;
        }

                const address = (
          item.address &&
          typeof item.address === 'object'
            ? item.address
            : {}
        ) as Record<string, unknown>;

        const text = (key: string) =>
          typeof address[key] === 'string'
            ? address[key] as string
            : '';

        const houseNumber =
          text('house_number') || null;

        const road =
          text('road') ||
          text('pedestrian') ||
          text('residential') ||
          text('footway');

        const area =
          text('quarter') ||
          text('suburb') ||
          text('city_district');

        const city =
          text('city') ||
          text('town') ||
          text('municipality') ||
          text('state');

        const shortAddress = [
          ...new Set(
            [
              [houseNumber, road]
                .filter(Boolean)
                .join(' '),
              area,
              city,
            ].filter(Boolean),
          ),
        ].join(', ');

        const named =
          typeof item.name === 'string'
            ? item.name.trim()
            : '';

        const category = String(
          item.category ?? item.class ?? '',
        );

        const addressType = String(
          item.addresstype ?? item.type ?? '',
        );

        const isAddress =
          category === 'highway' ||
          [
            'house',
            'house_number',
            'road',
            'residential',
            'postcode',
            'city',
            'suburb',
            'quarter',
          ].includes(addressType);

        const title = isAddress
          ? shortAddress || item.display_name
          : named ||
            item.display_name.split(',')[0];

        result.push({
          id: String(item.place_id),
          label: item.display_name,
          latitude,
          longitude,
          houseNumber,
          title,
          subtitle:
            isAddress ? '' : shortAddress,
          isAddress,
        });
      }

      if (cache.size >= 100) cache.clear();
      cache.set(key, result);

      return result;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          'Tìm địa chỉ quá 15 giây. Hãy thử lại.',
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  });

  queue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}