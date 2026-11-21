import {
    Camera,
    GeoJSONSource,
    Layer,
    Map,
    Marker,
    type CameraRef,
} from '@maplibre/maplibre-react-native';

import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import {
    ActivityIndicator,
    AppState,
    Modal,
    Pressable,
    Text,
    View,
} from 'react-native';

import type { Feature, LineString } from 'geojson';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Place } from '@/data/place.types';
import { getTripLocation } from '@/features/discovery/trip-location';
import { useSettingsColors } from '@/features/settings/settings-colors';

import {
    getQuickNavigation,
    validRoutePoint,
} from '@/features/discovery/trip-routing';

import {
    buildNavigation,
    TurnNavigator,
    type TurnGuidance,
} from '@/features/discovery/turn-guidance';

export default function EventDirections({
  place,
  close,
}: {
  place: Place;
  close: () => void;
}) {
  const c = useSettingsColors();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraRef | null>(null);

  const [mode, setMode] =
    useState<'driving' | 'walking'>('driving');

  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const [position, setPosition] =
    useState<[number, number] | null>(null);

  const [line, setLine] =
    useState<Feature<LineString> | null>(null);

  const [guidance, setGuidance] =
    useState<TurnGuidance | null>(null);

  const [follow, setFollow] = useState(true);

  const validDestination =
    place.coordinates_valid && validRoutePoint(place);

  const destination: [number, number] =
    validDestination
      ? [place.longitude, place.latitude]
      : [108.22, 16.06];

  useEffect(() => {
    let alive = true;

    let subscription:
      Location.LocationSubscription | null = null;

    const controller = new AbortController();

    function stop() {
      controller.abort();
      subscription?.remove();
      subscription = null;
    }

    const listener = AppState.addEventListener(
      'change',
      state => {
        if (state !== 'active') {
          stop();

          if (alive) {
            setPaused(true);
          }
        } else if (alive) {
          setRetry(value => value + 1);
        }
      },
    );

    void (async () => {
      setLoading(true);
      setPaused(false);
      setError('');
      setLine(null);
      setGuidance(null);
      setPosition(null);

      try {
        if (
          !place.coordinates_valid ||
          !validRoutePoint(place)
        ) {
          throw new Error(
            'Địa điểm chưa có tọa độ hợp lệ trong danh mục.',
          );
        }

        const location = await getTripLocation(
          controller.signal,
        );

        if (!alive || controller.signal.aborted) return;

        const raw = await getQuickNavigation(
          location.coords,
          place,
          mode,
        );

        if (!alive || controller.signal.aborted) return;

        const navigation = buildNavigation(raw);

        const navigator = new TurnNavigator(
          navigation,
          mode === 'walking',
        );

        setLine({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: navigation.points,
          },
        });

        const update = (
          fix: Location.LocationObject,
        ) => {
          if (!alive || controller.signal.aborted) return;

          const point: [number, number] = [
            fix.coords.longitude,
            fix.coords.latitude,
          ];

          setPosition(point);

          setGuidance(
            navigator.update({
              point,
              accuracy: fix.coords.accuracy,
              timestamp: fix.timestamp,
            }),
          );
        };

        update(location);

        const watcher =
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              distanceInterval: 3,
            },
            update,
          );

        if (!alive || controller.signal.aborted) {
          watcher.remove();
        } else {
          subscription = watcher;
        }
      } catch (reason) {
        if (alive && !controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Chưa mở được dẫn đường.',
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      stop();
      listener.remove();
    };
  }, [place, mode, retry]);

  useEffect(() => {
    if (mapReady && position && follow) {
      camera.current?.easeTo({
        center: position,
        zoom: 16,
        duration: 500,
      });
    }
  }, [mapReady, position, follow]);

  function overview() {
    if (!line) return;

    setFollow(false);

    const points = line.geometry.coordinates;

    camera.current?.fitBounds(
      [
        Math.min(...points.map(point => point[0])),
        Math.min(...points.map(point => point[1])),
        Math.max(...points.map(point => point[0])),
        Math.max(...points.map(point => point[1])),
      ],
      {
        padding: {
          top: 45,
          bottom: 45,
          left: 35,
          right: 35,
        },
        duration: 500,
      },
    );
  }

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={close}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: c.background,
        }}
      >
        <View style={{ padding: 12, gap: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <NavButton label="‹ Đóng" onPress={close} />

            <Text
              style={{
                flex: 1,
                color: c.text,
                fontWeight: '800',
                fontSize: 15,
              }}
            >
              {place.name}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <NavButton
              label="Ô tô"
              onPress={() => setMode('driving')}
              selected={mode === 'driving'}
            />

            <NavButton
              label="Đi bộ"
              onPress={() => setMode('walking')}
              selected={mode === 'walking'}
            />

            <NavButton
              label="Tính lại tuyến"
              onPress={() => setRetry(value => value + 1)}
            />
          </View>

          {loading && (
            <ActivityIndicator color={c.green} />
          )}

          <Text
            style={{
              color: error ? c.danger : c.text,
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {paused
              ? 'Đã tạm dừng GPS khi ứng dụng ở nền.'
              : error ||
                (
                  loading
                    ? 'Đang lấy vị trí và tính tuyến…'
                    : guidance
                      ? `${guidance.icon} ${guidance.text}`
                      : 'Đang chờ GPS…'
                )}
          </Text>

          {!paused &&
            !loading &&
            guidance?.remainingMeters !== null &&
            guidance?.remainingMeters !== undefined && (
              <Text
                style={{
                  color: c.green,
                  fontWeight: '700',
                }}
              >
                Còn khoảng{' '}
                {(guidance.remainingMeters / 1000).toFixed(1)}
                {' '}km
              </Text>
            )}

          {mapError && (
            <Text style={{ color: c.danger }}>
              Chưa tải được nền bản đồ. Kiểm tra Internet
              rồi mở lại.
            </Text>
          )}
        </View>

        <Map
          style={{ flex: 1 }}
          androidView="texture"
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          attribution
          onDidFinishLoadingMap={() => setMapReady(true)}
          onDidFailLoadingMap={() => setMapError(true)}
        >
          <Camera
            ref={camera}
            center={destination}
            zoom={13}
          />

          {!!line && (
            <GeoJSONSource
              id="event-route"
              data={line}
            >
              <Layer
                id="event-route-line"
                type="line"
                paint={{
                  'line-color': '#1686C7',
                  'line-width': 6,
                }}
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
              />
            </GeoJSONSource>
          )}

          {validDestination && (
            <Marker
              id="event-destination"
              lngLat={destination}
            >
              <View
                style={{
                  backgroundColor: '#087F61',
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Text style={{ color: '#FFF' }}>
                  Đích
                </Text>
              </View>
            </Marker>
          )}

          {!!position && (
            <Marker
              id="event-position"
              lngLat={position}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 3,
                  borderColor: '#FFF',
                  backgroundColor: '#1686C7',
                }}
              />
            </Marker>
          )}
        </Map>

        <View style={{ padding: 12, gap: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <NavButton
              label="Theo GPS"
              onPress={() => setFollow(true)}
              selected={follow}
            />

            <NavButton
              label="Toàn tuyến"
              onPress={overview}
            />
          </View>

          <Text
            style={{
              color: c.muted,
              fontSize: 11,
              lineHeight: 17,
            }}
          >
            Nếu lệch tuyến, chọn “Tính lại tuyến”.
            Dẫn đường nhanh không thay đổi chuyến đi
            hoặc tự đánh dấu hoàn thành.
            Bản này chưa có đọc chỉ dẫn bằng giọng nói.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function NavButton({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const c = useSettingsColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        padding: 10,
        borderRadius: 12,
        backgroundColor: selected ? c.pale : c.input,
      }}
    >
      <Text
        style={{
          color: selected ? c.green : c.text,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}