import oldHomeHtml from '../../../data/sdt-html';

import {
    findPlaceById,
    normalizeSearch,
    places,
} from '@/data/places.local';

import type { Place } from '@/data/place.types';

export function oldPhoto(key: string): string | null {
  return (
    new RegExp(key + ": '([^']+)'")
      .exec(oldHomeHtml)?.[1] || null
  );
}

export const EVENT_ITEMS = [
  {
    id: 'dragon',
    title: 'Cầu Rồng Phun Lửa & Phun Nước',
    when: '21:00 · Lịch tham khảo',
    where: 'Khu vực Cầu Rồng, Đà Nẵng',
    image: oldPhoto('caurong'),
    placeId: 'google:ChIJL1GKWJYZQjERLrEGqlK2kwQ',
    names: ['cau rong', 'dragon bridge'],
    description:
      'Ngắm Cầu Rồng và cảnh quan sông Hàn về đêm. ' +
      'Hoạt động phun lửa, phun nước diễn ra theo lịch công bố; ' +
      'cần xác nhận lịch trước khi đến. ' +
      'Nên chọn vị trí quan sát phù hợp và đến sớm.',
  },
  {
    id: 'market',
    title: 'Chợ Đêm Sơn Trà & Ẩm Thực',
    when: 'Buổi tối · Lịch tham khảo',
    where: 'Mai Hắc Đế, Sơn Trà',
    image: oldPhoto('chodem'),
    placeId: 'osm_way_1556362196',
    names: ['cho dem son tra', 'son tra night market'],
    description:
      'Khám phá các gian hàng ẩm thực, đồ lưu niệm và ' +
      'không khí chợ đêm gần Cầu Rồng. ' +
      'Hỏi giá trước khi mua; giờ hoạt động có thể ' +
      'thay đổi theo từng gian hàng.',
  },
  {
    id: 'cruise',
    title: 'Du Thuyền Sông Hàn Ngắm Cầu Rồng',
    when: 'Theo lịch nhà vận hành',
    where: 'Địa điểm dịch vụ trong danh mục',
    image: oldPhoto('duthuyen'),
    placeId: 'google:ChIJe8ah9rsZQjER6VQTZMzcGTw',
    names: ['du thuyen song han da nang (2da tickets)'],
    description:
      'Trải nghiệm ngắm những cây cầu và thành phố từ sông Hàn. ' +
      'Cần liên hệ nhà vận hành để xác nhận vé, giờ khởi hành ' +
      'và bến lên tàu. Điểm dẫn đường ở đây là địa chỉ dịch vụ ' +
      'trong danh mục, không mặc định là bến lên tàu.',
  },
  {
    id: 'swing',
    title: 'Cầu Quay Sông Hàn Trình Diễn Quay',
    when: 'Lịch quay cần xác nhận',
    where: 'Cầu Sông Hàn, Đà Nẵng',
    image: null,
    placeId: 'google:ChIJ0TaKzTEYQjERTlrM9mbnTTg',
    names: ['cau song han', 'han river bridge'],
    description:
      'Dạo bên sông và ngắm ánh sáng của Cầu Sông Hàn. ' +
      'Hoạt động quay cầu phụ thuộc lịch vận hành thực tế; ' +
      'không phải lúc nào đến cũng có trình diễn. ' +
      'Nên xác nhận lịch trước khi sắp xếp chuyến đi.',
  },
];

export function getEventPlace(id: string): Place | null {
  const event = EVENT_ITEMS.find(item => item.id === id);

  if (!event) return null;

  const place =
    findPlaceById(event.placeId) ||
    places.find(
      item =>
        (
          item.category === 'tham_quan' ||
          item.category === 'giai_tri'
        ) &&
        event.names.includes(normalizeSearch(item.name)),
    );

  if (!place) return null;

  return {
    ...place,
    name: event.title,
    description: event.description,
    image_url: event.image || place.image_url,
  };
}