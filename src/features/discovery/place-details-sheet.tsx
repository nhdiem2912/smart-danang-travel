import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import {
  PLACE_CATEGORIES,
  type Place,
} from '@/data/place.types';

import { useSettingsColors } from '@/features/settings/settings-colors';

import { openingHours } from './opening-hours';
import { PlaceThumb } from './place-thumb';
import { Action, Sheet } from './ui';

export function PlaceDetailsSheet({
  place,
  close,
  onAdd,
  onNavigate,
}: {
  place: Place;
  close: () => void;
  onAdd: () => void;
  onNavigate?: () => void;
}) {
  const c = useSettingsColors();
  const hours = openingHours(place.opening_hours_raw);

  const rating =
    place.rating === null
      ? 'Chưa có đánh giá'
      : `${place.rating.toFixed(1)}${
          place.rating_count === null
            ? ''
            : ` · ${place.rating_count.toLocaleString('vi-VN')} đánh giá`
        }`;

  return (
    <Sheet
      title="Thông tin địa điểm"
      visible
      close={close}
      footer={
  <View style={{ gap: 8 }}>
    {!!onNavigate && (
      <Action
        label="Dẫn đường trong app"
        onPress={onNavigate}
      />
    )}

    <Action
      solid
      label="＋ Thêm vào lộ trình"
      onPress={onAdd}
    />
  </View>
}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <PlaceThumb place={place} />

        <View style={{ flex: 1, gap: 7 }}>
          <Text
            style={{
              fontSize: 19,
              fontWeight: '800',
              color: c.text,
            }}
          >
            {place.name}
          </Text>

          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: c.green,
            }}
          >
            {PLACE_CATEGORIES[place.category]}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: c.muted,
            }}
          >
            ★ {rating}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color={c.green}
        />

        <Text
          selectable
          style={{
            flex: 1,
            fontSize: 13,
            lineHeight: 20,
            color: c.text,
          }}
        >
          {place.address || 'Chưa cập nhật địa chỉ'}
        </Text>
      </View>

      {!!place.description && (
        <Text
          style={{
            fontSize: 13,
            lineHeight: 21,
            color: c.muted,
          }}
        >
          {place.description}
        </Text>
      )}

      <View
        style={{
          padding: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.input,
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons
            name="time-outline"
            size={19}
            color={c.green}
          />

          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: c.text,
            }}
          >
            Giờ mở cửa
          </Text>
        </View>

        {hours.rows.length ? (
          hours.rows.map(row => (
            <View
              key={row.day}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <Text
                style={{
                  width: 80,
                  fontSize: 12,
                  lineHeight: 20,
                  color: c.muted,
                }}
              >
                {row.day}
              </Text>

              <Text
                style={{
                  flex: 1,
                  textAlign: 'right',
                  fontSize: 13,
                  lineHeight: 20,
                  fontWeight: '600',
                  color: c.text,
                }}
              >
                {row.hours}
              </Text>
            </View>
          ))
        ) : (
          <Text
            style={{
              color: c.muted,
              fontSize: 12,
            }}
          >
            Chưa cập nhật giờ mở cửa.
          </Text>
        )}

        <Text
          style={{
            color: c.muted,
            fontSize: 10,
            lineHeight: 16,
          }}
        >
          Giờ tham khảo, có thể thay đổi vào ngày lễ.
          Nên xác nhận với địa điểm trước khi đến.
        </Text>
      </View>

      {(!!place.phone || !!place.website) && (
        <View
          style={{
            gap: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: c.text,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            Liên hệ
          </Text>

          {!!place.phone && (
            <View
              style={{
                flexDirection: 'row',
                gap: 9,
              }}
            >
              <Ionicons
                name="call-outline"
                size={17}
                color={c.green}
              />

              <Text
                selectable
                style={{
                  flex: 1,
                  color: c.text,
                  fontSize: 13,
                }}
              >
                {place.phone}
              </Text>
            </View>
          )}

          {!!place.website && (
            <View
              style={{
                flexDirection: 'row',
                gap: 9,
              }}
            >
              <Ionicons
                name="globe-outline"
                size={17}
                color={c.green}
              />

              <Text
                selectable
                style={{
                  flex: 1,
                  color: c.green,
                  fontSize: 12,
                  lineHeight: 19,
                }}
              >
                {place.website}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text
        style={{
          fontSize: 10,
          lineHeight: 16,
          color: c.muted,
        }}
      >
        Tọa độ: {place.latitude.toFixed(5)},{' '}
        {place.longitude.toFixed(5)}
        {place.location_verified
          ? ''
          : ' · Chưa xác minh thực địa'}
        {'\n'}
        Nguồn dữ liệu: {place.data_source || 'Chưa cập nhật'}
      </Text>
    </Sheet>
  );
}