import { Text, View } from 'react-native';

import {
    PLACE_CATEGORIES,
    type Place,
} from '@/data/place.types';
import { PlaceThumb } from './place-thumb';
import { Action, C, Sheet, s } from './ui';

export function PlaceDetailsSheet({
  place,
  close,
  onAdd,
}: {
  place: Place;
  close: () => void;
  onAdd: () => void;
}) {
  return (
    <Sheet
      title="Thông tin địa điểm"
      visible
      close={close}
      footer={
        <Action
          solid
          label="＋ Thêm vào lộ trình"
          onPress={onAdd}
        />
      }
    >
      <View style={s.row}>
        <PlaceThumb place={place} />

        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.title}>{place.name}</Text>
          <Text style={s.muted}>
            {PLACE_CATEGORIES[place.category]}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: C.ink }}>
        📍 {place.address ?? 'Chưa cập nhật địa chỉ'}
      </Text>

      <Text style={s.muted}>
        {place.description ?? 'Chưa cập nhật mô tả.'}
      </Text>

      <Text style={s.muted}>
        Giờ mở cửa (dữ liệu gốc OSM):{' '}
        {place.opening_hours_raw ?? 'Chưa cập nhật'}
      </Text>

      <Text style={s.muted}>
        {place.rating === null
          ? 'Chưa có đánh giá'
          : `★ ${place.rating}${
              place.rating_count === null
                ? ''
                : ` (${place.rating_count})`
            }`}
      </Text>

      {!!place.phone && (
        <Text style={s.muted}>
          Điện thoại: {place.phone}
        </Text>
      )}

      {!!place.website && (
        <Text selectable style={s.muted}>
          Website: {place.website}
        </Text>
      )}

      <Text style={s.muted}>
        Tọa độ: {place.latitude}, {place.longitude}.
        Chưa xác minh thực địa.
      </Text>

      <Text style={s.muted}>
        Nguồn: © OpenStreetMap contributors
      </Text>
    </Sheet>
  );
}