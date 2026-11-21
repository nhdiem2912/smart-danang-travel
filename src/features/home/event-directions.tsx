import {
    Modal,
    Pressable,
    Text,
    View,
} from 'react-native';

import type { Place } from '@/data/place.types';

export default function EventDirections({
  place,
  close,
}: {
  place: Place;
  close: () => void;
}) {
  return (
    <Modal visible onRequestClose={close}>
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <Text>{place.name}</Text>

        <Text>
          Dẫn đường GPS trong app hiện dùng trên bản
          Android/iOS.
        </Text>

        <Pressable onPress={close}>
          <Text>Đóng</Text>
        </Pressable>
      </View>
    </Modal>
  );
}