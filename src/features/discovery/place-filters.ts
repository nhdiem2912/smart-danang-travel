import type { Place } from '@/data/place.types';

export type FilterPoint = { latitude: number; longitude: number };
export type PricePreset = 'all' | 'free' | 'under200' | '200to500' | 'over500' | 'custom';
export type DiscoveryFilters = {
  radiusKm: number | null;
  origin: FilterPoint | null;
  areas: string[];
  minRating: number | null;
  pricePreset: PricePreset;
  maxPriceVnd: number;
  popularFirst: boolean;
  onlySelected: boolean;
};
export type FilterablePlace = Place & {
  area?: string | null;
  budget_per_person_min_vnd?: number | null;
  budget_per_person_max_vnd?: number | null;
};

export function defaultDiscoveryFilters(): DiscoveryFilters {
  return { radiusKm: null, origin: null, areas: [], minRating: null, pricePreset: 'all', maxPriceVnd: 550000, popularFirst: false, onlySelected: false };
}
export function copyDiscoveryFilters(value: DiscoveryFilters): DiscoveryFilters {
  return { ...value, areas: [...value.areas], origin: value.origin ? { ...value.origin } : null };
}
export function validFilterPoint(value: FilterPoint | null | undefined): value is FilterPoint {
  return Boolean(value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180);
}
export function discoveryFilterError(value: DiscoveryFilters): string | null {
  if (value.radiusKm !== null && (!Number.isFinite(value.radiusKm) || value.radiusKm <= 0 || value.radiusKm > 30)) return 'Chọn bán kính từ 1 đến 30 km.';
  if (value.radiusKm !== null && !validFilterPoint(value.origin)) return 'Hãy lấy vị trí GPS trước khi lọc theo khoảng cách.';
  if (value.minRating !== null && (!Number.isFinite(value.minRating) || value.minRating < 0 || value.minRating > 5)) return 'Mức đánh giá chưa hợp lệ.';
  if (!Number.isFinite(value.maxPriceVnd) || value.maxPriceVnd < 0) return 'Mức giá chưa hợp lệ.';
  return null;
}
export function distanceFromPlace(place: Place, origin: FilterPoint | null): number | null {
  if (!validFilterPoint(origin) || !place.coordinates_valid || !validFilterPoint(place)) return null;
  const rad = Math.PI / 180;
  const dLat = (place.latitude - origin.latitude) * rad;
  const dLon = (place.longitude - origin.longitude) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(origin.latitude * rad) * Math.cos(place.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(Math.max(0, 1 - a)));
}
function budget(place: FilterablePlace): { min: number; max: number } | null {
  const min = place.budget_per_person_min_vnd;
  const max = place.budget_per_person_max_vnd;
  return typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min ? { min, max } : null;
}
export function hasDiscoveryPriceData(input: readonly FilterablePlace[]): boolean {
  return input.some(place => budget(place) !== null);
}
export function discoveryAreas(input: readonly FilterablePlace[]): string[] {
  return [...new Set(input.map(place => place.area?.trim()).filter((area): area is string => Boolean(area)))].sort((a, b) => a.localeCompare(b, 'vi'));
}
export function discoveryFilterCount(value: DiscoveryFilters): number {
  return Number(value.radiusKm !== null) + Number(value.areas.length > 0) + Number(value.minRating !== null || value.popularFirst) + Number(value.pricePreset !== 'all') + Number(value.onlySelected);
}
export function applyDiscoveryFilters<T extends FilterablePlace>(
  input: readonly T[], value: DiscoveryFilters, selected: ReadonlySet<string> = new Set(),
): T[] {
  const error = discoveryFilterError(value);
  if (error) throw new Error(error);
  const rows = input.map((place, index) => ({ place, index, distance: value.radiusKm === null ? null : distanceFromPlace(place, value.origin) }))
    .filter(({ place, distance }) => {
      if (value.onlySelected && !selected.has(place.id)) return false;
      if (value.areas.length && (!place.area || !value.areas.includes(place.area.trim()))) return false;
      if (value.minRating !== null && (place.rating === null || !Number.isFinite(place.rating) || place.rating < value.minRating)) return false;
      if (value.radiusKm !== null && (distance === null || distance > value.radiusKm)) return false;
      if (value.pricePreset === 'all') return true;
      const price = budget(place);
      if (!price) return false;
      switch (value.pricePreset) {
        case 'free': return price.min === 0 && price.max === 0;
        case 'under200': return price.max < 200000;
        case '200to500': return price.min >= 200000 && price.max <= 500000;
        case 'over500': return price.min > 500000;
        case 'custom': return price.max <= value.maxPriceVnd;
        default: return false;
      }
    });
  if (value.popularFirst) rows.sort((a, b) => (b.place.rating_count ?? -1) - (a.place.rating_count ?? -1) || (b.place.rating ?? -1) - (a.place.rating ?? -1) || a.index - b.index);
  else if (value.radiusKm !== null) rows.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.index - b.index);
  return rows.map(row => row.place);
}
