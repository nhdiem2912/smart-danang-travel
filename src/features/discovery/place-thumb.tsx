import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  PLACE_CATEGORIES,
  type Place,
} from '@/data/place.types';

const icons = {
  tham_quan: '🏛️',
  an_uong: '🍽️',
  mua_sam: '🛍️',
  khach_san: '🏨',
  giai_tri: '🎡',
  bai_bien: '🏖️',
};

export function PlaceThumb({
  place,
  size = 76,
}: {
  place: Place;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (place.image_url && place.image_url !== failedUri) {
    return (
      <Image
        source={{ uri: place.image_url }}
        recyclingKey={place.id}
        onError={() => setFailedUri(place.image_url)}
        contentFit="cover"
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          backgroundColor: '#E4F3EC',
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`Chưa có ảnh ${place.name}`}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: '#E4F3EC',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: size > 60 ? 25 : 18 }}>
        {icons[place.category]}
      </Text>

      {size > 60 && (
        <Text style={{ fontSize: 8, color: '#639581' }}>
          {PLACE_CATEGORIES[place.category]}
        </Text>
      )}
    </View>
  );
}