import {
    Camera,
    Map,
    Marker,
} from '@maplibre/maplibre-react-native';

import { useState } from 'react';
import { Modal, Text, View } from 'react-native';

import {
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { PinProps } from './trip-origin-pin';
import { validRoutePoint } from './trip-routing';
import { Action } from './ui';

export default function TripOriginPin({
  initial,
  label,
  onConfirm,
  onClose,
}: PinProps) {
  const insets = useSafeAreaInsets();

  const [point, setPoint] = useState(
    initial && validRoutePoint(initial)
      ? initial
      : null,
  );

  const [center] =
    useState<[number, number]>(() =>
      point
        ? [point.longitude, point.latitude]
        : [108.245, 16.05],
    );

  const [error, setError] = useState('');

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      hardwareAccelerated
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: '#FFF',
        }}
      >
        <View style={{ padding: 14, gap: 7 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '800',
            }}
          >
            Chọn điểm xuất phát
          </Text>

          {!!label && <Text>{label}</Text>}

          <Text style={{ color: '#526579' }}>
            Phóng to rồi chạm đúng vị trí trên
            bản đồ để đặt ghim.
          </Text>
        </View>

        <Map
          style={{ flex: 1 }}
          androidView="texture"
          attribution
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onDidFailLoadingMap={() =>
            setError(
              'Chưa tải được bản đồ. Kiểm tra mạng.',
            )
          }
          onPress={event => {
            const [
              longitude,
              latitude,
            ] = event.nativeEvent.lngLat;

            const next = {
              latitude,
              longitude,
            };

            if (validRoutePoint(next)) {
              setPoint(next);
            }
          }}
        >
          <Camera center={center} zoom={15} />

          {point && (
            <Marker
              id="selected-origin"
              lngLat={[
                point.longitude,
                point.latitude,
              ]}
            >
              <View
                style={{
                  backgroundColor: '#008577',
                  borderRadius: 20,
                  padding: 10,
                  borderColor: '#FFF',
                  borderWidth: 2,
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontWeight: '800',
                  }}
                >
                  S
                </Text>
              </View>
            </Marker>
          )}
        </Map>

        <View style={{ padding: 14, gap: 8 }}>
          {!!error && (
            <Text style={{ color: '#B42318' }}>
              {error}
            </Text>
          )}

          <Action
            solid
            label="Dùng vị trí ghim này"
            disabled={!point}
            onPress={() => {
              if (point) onConfirm(point);
            }}
          />

          <Action
            label="Hủy"
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}