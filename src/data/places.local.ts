import {
  PLACE_CATEGORIES,
  type Place,
  type PlaceCategory,
} from './place.types';

import rawPlaces from './places.json';

export type StoredPlace = Place & {
  legacy_only: boolean;
};

export type CatalogState = {
  places: Place[];
  source: 'bundled' | 'cache' | 'api';
  syncedAt: string | null;
  syncing: boolean;
  error: string | null;
};

export function validateCatalog(
  value: unknown,
): StoredPlace[] {
  if (
    !Array.isArray(value) ||
    value.length > 10000
  ) {
    throw new Error(
      'Danh sách địa điểm không hợp lệ.',
    );
  }

  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      throw new Error(
        'Địa điểm không hợp lệ.',
      );
    }

    const p = item as Record<string, unknown>;

    if (
      typeof p.id !== 'string' ||
      !p.id.trim() ||
      ids.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      typeof p.category !== 'string' ||
      !Object.hasOwn(
        PLACE_CATEGORIES,
        p.category,
      ) ||
      typeof p.legacy_only !== 'boolean' ||
      typeof p.coordinates_valid !== 'boolean' ||
      typeof p.latitude !== 'number' ||
      !Number.isFinite(p.latitude) ||
      Math.abs(p.latitude) > 90 ||
      typeof p.longitude !== 'number' ||
      !Number.isFinite(p.longitude) ||
      Math.abs(p.longitude) > 180 ||
      !(
        p.opening_hours_raw === null ||
        typeof p.opening_hours_raw === 'string'
      ) ||
      !(
        p.rating === null ||
        (
          typeof p.rating === 'number' &&
          Number.isFinite(p.rating) &&
          p.rating >= 0 &&
          p.rating <= 5
        )
      ) ||
      !(
        p.rating_count === null ||
        (
          typeof p.rating_count === 'number' &&
          Number.isInteger(p.rating_count) &&
          p.rating_count >= 0
        )
      )
    ) {
      throw new Error(
        'Dữ liệu địa điểm thiếu, trùng ID hoặc sai định dạng.',
      );
    }

    ids.add(p.id);
  }

  return value as StoredPlace[];
}

const bundled = validateCatalog(rawPlaces);

let byId = new Map(
  bundled.map(place => [
    place.id,
    place,
  ]),
);

export let places: Place[] =
  bundled.filter(
    place => !place.legacy_only,
  );

let state: CatalogState = {
  places,
  source: 'bundled',
  syncedAt: null,
  syncing: false,
  error: null,
};

const listeners = new Set<() => void>();

export const getCatalogState = () => state;

export function subscribeCatalog(
  listener: () => void,
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setCatalogStatus(
  patch: Partial<
    Pick<
      CatalogState,
      'syncing' | 'error'
    >
  >,
) {
  state = {
    ...state,
    ...patch,
  };

  listeners.forEach(
    listener => listener(),
  );
}

export function mergeCatalog(
  value: unknown,
): StoredPlace[] {
  const rows = validateCatalog(value);

  const next = new Map(
    rows.map(place => [
      place.id,
      place,
    ]),
  );

  // Giữ ID cũ để lịch trình đã lưu vẫn tra cứu được.
  for (const [id, old] of byId) {
    if (!next.has(id)) {
      next.set(id, {
        ...old,
        legacy_only: true,
      });
    }
  }

  return [...next.values()];
}

export function applyCatalog(
  value: unknown,
  source: 'cache' | 'api',
  syncedAt: string,
) {
  const rows = mergeCatalog(value);

  byId = new Map(
    rows.map(place => [
      place.id,
      place,
    ]),
  );

  places = rows.filter(
    place => !place.legacy_only,
  );

  state = {
    ...state,
    places,
    source,
    syncedAt,
  };

  listeners.forEach(
    listener => listener(),
  );
}

export function findPlaceById(
  id: string,
): Place | undefined {
  return byId.get(id);
}

export function normalizeSearch(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\bdanang\b/g, 'da nang')
    .replace(/\s+/g, ' ')
    .trim();
}

type PlaceQuery = {
  category?: PlaceCategory | 'all';
  query?: string;
  offset?: number;
  limit?: number;
};

export function getPlacePage({
  category = 'all',
  query = '',
  offset = 0,
  limit = 20,
}: PlaceQuery = {}) {
  const keyword = normalizeSearch(query);

  const filtered = places.filter(place =>
    (
      category === 'all' ||
      place.category === category
    ) &&
    (
      !keyword ||
      normalizeSearch(
        place.search_text ||
        `${place.name} ${place.address ?? ''}`,
      ).includes(keyword)
    ),
  );

  const start = Number.isFinite(offset)
    ? Math.max(0, Math.floor(offset))
    : 0;

  const size = Number.isFinite(limit)
    ? Math.min(
        100,
        Math.max(1, Math.floor(limit)),
      )
    : 20;

  const items = filtered.slice(
    start,
    start + size,
  );

  const next = start + items.length;

  return {
    items,
    total: filtered.length,
    nextOffset:
      next < filtered.length
        ? next
        : null,
  };
}