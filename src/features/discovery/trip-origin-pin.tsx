import { Modal, Text, View } from 'react-native';
import type { RoutePoint } from './trip-routing';
import { Action } from './ui';

export type PinProps = {
  initial: RoutePoint | null;
  label: string;
  onConfirm: (point: RoutePoint) => void;
  onClose: () => void;
};

export default function TripOriginPin({
  onClose,
}: PinProps) {
  return (
    <Modal
      visible
      onRequestClose={onClose}
    >
      <View style={{ padding: 24 }}>
        <Text>
          Chọn ghim trên bản đồ có trên ứng dụng
          Android/iOS.
        </Text>

        <Action
          label="Đóng"
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}