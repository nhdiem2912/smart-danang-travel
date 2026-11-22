import { oldPhoto } from './home-events';

export const HOME_BANNERS = [
  {
    placeId: 'google:ChIJ9R9l5N89QjERbzmmvAxpZB8',
    title: 'Cây đa Sơn Trà – Dấu xanh bán đảo',
    tag: 'THIÊN NHIÊN SƠN TRÀ',
    subtitle:
      'Khám phá một điểm đến xanh trên bán đảo Sơn Trà',
    image: null as string | null,
  },
  {
    placeId: 'google:ChIJL1GKWJYZQjERLrEGqlK2kwQ',
    title: 'Cầu Rồng – Biểu tượng Đà Nẵng',
    tag: 'THÀNH PHỐ BÊN SÔNG HÀN',
    subtitle:
      'Khám phá cảnh sắc thành phố về đêm',
    image: oldPhoto('caurong'),
  },
  {
    placeId: 'osm_way_1556362196',
    title: 'Chợ đêm Sơn Trà',
    tag: 'TRẢI NGHIỆM VỀ ĐÊM',
    subtitle:
      'Ẩm thực và những trải nghiệm địa phương',
    image: oldPhoto('chodem'),
  },
];