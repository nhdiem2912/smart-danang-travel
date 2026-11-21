import {
    PLACE_CATEGORIES,
    type Place,
    type PlaceCategory,
} from './place.types';

import rawPlaces from './places.json';

type StoredPlace = Place & {
  legacy_only?: boolean;
};

function isPlaceCategory(
  value: string,
): value is PlaceCategory {
  return Object.prototype.hasOwnProperty.call(
    PLACE_CATEGORIES,
    value,
  );
}

const catalog: StoredPlace[] = (
  rawPlaces as unknown as StoredPlace[]
).map(row => {
  if (
    !isPlaceCategory(row.category) ||
    typeof row.id !== 'string' ||
    typeof row.name !== 'string'
  ) {
    throw new Error(
      `Địa điểm không hợp lệ: ${String(row.id)}`,
    );
  }

  return row;
});

// Danh mục hiện hành cho Khám phá và bản đồ.
export const places: Place[] = catalog.filter(
  place => !place.legacy_only,
);

// Giữ khả năng tra cứu ID của lịch trình cũ.
const placesById = new Map(
  catalog.map(place => [place.id, place]),
);

export function findPlaceById(
  id: string,
): Place | undefined {
  return placesById.get(id);
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

  const filtered = places.filter(place => {
    const matchesCategory =
      category === 'all' ||
      place.category === category;

    const search = normalizeSearch(
      place.search_text ||
      `${place.name} ${place.address ?? ''}`,
    );

    return (
      matchesCategory &&
      (
        !keyword ||
        search.includes(keyword)
      )
    );
  });

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