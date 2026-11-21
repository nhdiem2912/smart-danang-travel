import type { Place } from '@/data/place.types';
import { OPTIONS, type TravelerProfile } from './profile-model';

export function sortForProfile<T extends Place>(
  places: readonly T[],
  profile: TravelerProfile | null,
): T[] {
  if (!profile) return [...places];

  const interests = new Set(profile.interests);

  function score(place: Place): number {
    let points = 0;

    if (interests.has('beach') && place.category === 'bai_bien') {
      points += 3;
    }

    if (interests.has('food') && place.category === 'nha_hang') {
      points += 3;
    }

    if (interests.has('cafe') && place.category === 'nha_hang') {
      points += 1;
    }

    if (interests.has('culture') && place.category === 'tham_quan') {
      points += 3;
    }

    if (interests.has('photos') && place.category === 'tham_quan') {
      points += 2;
    }

    if (interests.has('nightlife') && place.category === 'giai_tri') {
      points += 3;
    }

    return points;
  }

  return places
    .map((place, index) => ({
      place,
      index,
      score: score(place),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(row => row.place);
}

export function personalizedQuestion(
  text: string,
  profile: TravelerProfile | null,
): string {
  if (!profile) return text;

  function label(key: 'companion' | 'budget' | 'timeSlot'): string {
    return (
      OPTIONS[key].find(option => option[0] === profile?.[key])?.[1] ?? ''
    );
  }

  const interests = OPTIONS.interests
    .filter(option => profile.interests.includes(option[0]))
    .map(option => option[1])
    .join(', ');

  const context =
    `\n\n[Sở thích du lịch: ${interests}. ` +
    `Đồng hành: ${label('companion')}. ` +
    `Ngân sách ưu tiên: ${label('budget')}. ` +
    `Giờ ưu tiên: ${label('timeSlot')}. ` +
    'Hãy cân nhắc các sở thích này khi gợi ý. ' +
    'Đây không phải dữ liệu giá hay giờ mở cửa đã xác minh; ' +
    'không khẳng định đã tạo lộ trình.]';

  return text.length + context.length <= 1000
    ? text + context
    : text;
}