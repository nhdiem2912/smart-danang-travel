import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    applyCatalog,
    mergeCatalog,
    setCatalogStatus,
    validateCatalog,
    type StoredPlace,
} from './places.local';

const BASE = (
  process.env.EXPO_PUBLIC_PLACES_API_URL ?? ''
)
  .trim()
  .replace(/\/+$/, '');

const KEY = `places-cache-v1:${BASE}`;

const INTERVAL = 5 * 60 * 1000;

type Manifest = {
  keys: string[];
  total: number;
  syncedAt: string;
};

let hydrated: Promise<void> | null = null;
let running: Promise<void> | null = null;
let lastAttempt = 0;

function manifest(
  raw: string | null,
): Manifest | null {
  if (!raw) return null;

  const m = JSON.parse(raw) as Manifest;

  if (
    !m ||
    !Array.isArray(m.keys) ||
    m.keys.length > 100 ||
    !m.keys.every(
      key =>
        typeof key === 'string' &&
        key.startsWith(`${KEY}:`),
    ) ||
    !Number.isInteger(m.total) ||
    m.total < 0 ||
    m.total > 10000 ||
    typeof m.syncedAt !== 'string' ||
    !Number.isFinite(
      Date.parse(m.syncedAt),
    )
  ) {
    throw new Error(
      'Cache không hợp lệ.',
    );
  }

  return m;
}

function hydrate() {
  if (!hydrated) {
    hydrated = (async () => {
      try {
        const saved = manifest(
          await AsyncStorage.getItem(KEY),
        );

        if (!saved) return;

        const parts =
          await AsyncStorage.multiGet(
            saved.keys,
          );

        const rows: unknown[] = [];

        for (const [, raw] of parts) {
          if (!raw) {
            throw new Error(
              'Cache chưa đầy đủ.',
            );
          }

          const part: unknown =
            JSON.parse(raw);

          if (!Array.isArray(part)) {
            throw new Error(
              'Cache không hợp lệ.',
            );
          }

          rows.push(...part);
        }

        if (rows.length !== saved.total) {
          throw new Error(
            'Cache chưa đầy đủ.',
          );
        }

        applyCatalog(
          rows,
          'cache',
          saved.syncedAt,
        );

        if (__DEV__) {
          console.log('[PLACES_SYNC]', {
            source: 'cache',
            total: rows.length,
          });
        }
      } catch {
        // Giữ dữ liệu có sẵn nếu cache lỗi.
      }
    })();
  }

  return hydrated;
}

async function saveCache(
  rows: StoredPlace[],
  syncedAt: string,
) {
  let old: Manifest | null = null;

  try {
    old = manifest(
      await AsyncStorage.getItem(KEY),
    );
  } catch {
    // Có thể thay cache cũ không hợp lệ.
  }

  const generation =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

  const entries: [string, string][] = [];

  // Chia nhỏ để tránh một bản ghi lưu trữ quá lớn.
  for (
    let i = 0;
    i < rows.length;
    i += 100
  ) {
    entries.push([
      `${KEY}:${generation}:${i}`,
      JSON.stringify(
        rows.slice(i, i + 100),
      ),
    ]);
  }

  const published = JSON.stringify({
    keys: entries.map(([key]) => key),
    total: rows.length,
    syncedAt,
  });

  try {
    await AsyncStorage.multiSet(entries);

    // Chỉ công nhận bản mới sau khi lưu đủ các phần.
    await AsyncStorage.setItem(
      KEY,
      published,
    );
  } catch (error) {
    let current:
      | string
      | null
      | undefined;

    try {
      current =
        await AsyncStorage.getItem(KEY);
    } catch {
      // Chưa xác định được kết quả ghi.
    }

    if (current !== published) {
      if (
        current !== undefined &&
        entries.length
      ) {
        try {
          await AsyncStorage.multiRemove(
            entries.map(([key]) => key),
          );
        } catch {
          // Không ảnh hưởng bản cache cũ.
        }
      }

      throw error;
    }
  }

  if (old?.keys.length) {
    try {
      await AsyncStorage.multiRemove(
        old.keys,
      );
    } catch {
      // Bản cache mới vẫn hợp lệ.
    }
  }
}

export async function refreshPlaces(
  force = false,
): Promise<void> {
  await hydrate();

  if (running) return running;

  if (
    !force &&
    lastAttempt &&
    Date.now() - lastAttempt < INTERVAL
  ) {
    return;
  }

  running = (async () => {
    lastAttempt = Date.now();

    setCatalogStatus({
      syncing: true,
      error: null,
    });

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      25000,
    );

    try {
      if (!/^https?:\/\//i.test(BASE)) {
        throw new Error(
          'Chưa cấu hình địa chỉ máy chủ địa điểm.',
        );
      }

      const response = await fetch(
        `${BASE}/api/catalog`,
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Máy chủ địa điểm trả HTTP ${response.status}.`,
        );
      }

      const data = await response.json();
      const rows = validateCatalog(data?.items);

      if (
        !Number.isInteger(data?.total) ||
        data.total !== rows.length
      ) {
        throw new Error(
          'Dữ liệu tải về chưa đầy đủ.',
        );
      }

      const merged = mergeCatalog(rows);
      const syncedAt =
        new Date().toISOString();

      let warning: string | null = null;

      try {
        await saveCache(
          merged,
          syncedAt,
        );
      } catch {
        warning =
          'Đã tải dữ liệu mới nhưng chưa lưu được bản ngoại tuyến.';
      }

      applyCatalog(
        merged,
        'api',
        syncedAt,
      );

      setCatalogStatus({
        error: warning,
      });

      if (__DEV__) {
        console.log('[PLACES_SYNC]', {
          source: 'api',
          total: rows.length,
          active: rows.filter(
            place => !place.legacy_only,
          ).length,
        });
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Chưa kết nối được máy chủ địa điểm.';

      if (__DEV__) {
        console.warn(
          '[PLACES_SYNC]',
          message,
        );
      }

      setCatalogStatus({
        error: message,
      });
    } finally {
      clearTimeout(timeout);

      setCatalogStatus({
        syncing: false,
      });
    }
  })();

  try {
    await running;
  } finally {
    running = null;
  }
}