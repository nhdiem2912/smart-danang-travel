// export const PLACE_CATEGORIES = {
//   tham_quan: 'Tham quan',
//   nha_hang: 'Nhà hàng',
//   mua_sam: 'Mua sắm',
//   khach_san: 'Khách sạn',
//   giai_tri: 'Giải trí',
//   bai_bien: 'Bãi biển',
// } as const;

// export type PlaceCategory = keyof typeof PLACE_CATEGORIES;

// export type Place = {
//   id: string;
//   name: string;
//   category: PlaceCategory;
//   address: string | null;
//   latitude: number;
//   longitude: number;

//   description: string | null;
//   image_url: string | null;
//   rating: number | null;
//   rating_count: number | null;

//   google_place_id: string | null;
//   google_maps_url: string | null;
//   osm_url: string | null;
//   website: string | null;
//   phone: string | null;
//   opening_hours_raw: string | null;

//   visit_duration_minutes: number | null;

//   source_image_url: string | null;
//   source_image_status: string | null;
//   image_status: string;
//   rating_source: string | null;
//   data_source: string;

//   coordinates_valid: boolean;
//   location_verified: boolean;
//   search_text: string;
// };
export const PLACE_CATEGORIES = {
  tham_quan: 'Tham quan',
  an_uong: 'Ăn uống',
  mua_sam: 'Mua sắm',
  khach_san: 'Khách sạn',
  giai_tri: 'Giải trí',
  bai_bien: 'Bãi biển',
} as const;

export type PlaceCategory = keyof typeof PLACE_CATEGORIES;

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string | null;
  latitude: number;
  longitude: number;

  description: string | null;
  image_url: string | null;
  rating: number | null;
  rating_count: number | null;

  google_place_id: string | null;
  google_maps_url: string | null;
  osm_url: string | null;
  website: string | null;
  phone: string | null;
  opening_hours_raw: string | null;

  visit_duration_minutes: number | null;

  source_image_url: string | null;
  source_image_status: string | null;
  image_status: string;
  rating_source: string | null;
  data_source: string;

  coordinates_valid: boolean;
  location_verified: boolean;
  search_text: string;
};