import { Text, View } from 'react-native';

import type { DraftStop, TravelMode } from './trip-model';
import { Action, useDiscoveryUI } from './ui';

export default function TripGuidance({
  onClose,
}: {
  stops: DraftStop[];
  travelMode: TravelMode;
  onClose: () => void;
}) {
  const { s } = useDiscoveryUI();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      <Text style={s.title}>
        Dẫn đường Google Navigation SDK khả dụng trên bản Android.
      </Text>

      <Action
        label="Quay lại lộ trình"
        onPress={onClose}
      />
    </View>
  );
}