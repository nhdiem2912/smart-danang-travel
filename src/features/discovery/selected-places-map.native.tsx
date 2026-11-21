import {
    Camera,
    GeoJSONSource,
    Layer,
    Map,
    Marker,
    type CameraRef,
} from '@maplibre/maplibre-react-native';

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type { Feature, LineString } from 'geojson';
import { Text, View } from 'react-native';

import type {
    OverviewMapProps,
} from './selected-places-map';

import type { TravelMode } from './trip-model';

import {
    getRouteShape,
    validRoutePoint,
    type RoutePoint,
} from './trip-routing';

export default function SelectedPlacesMap({
  places,
  numbers,
  origin,
  travelMode = 'driving',
  totalStops = places.length,
  onError,
}: OverviewMapProps) {
  const camera = useRef<CameraRef | null>(null);
  const [ready, setReady] = useState(false);

  const [layout, setLayout] = useState({
    width: 0,
    height: 0,
  });

  const [loaded, setLoaded] = useState<{
    key: string;
    road: [number, number][] | null;
    failed: boolean;
  } | null>(null);

  const pins = places
    .map((place, index) => ({
      place,
      number: numbers?.[index] ?? index + 1,
    }))
    .filter(
      item =>
        item.place.coordinates_valid &&
        validRoutePoint(item.place),
    );

  const points = [
    ...(
      origin && validRoutePoint(origin)
        ? [origin]
        : []
    ),
    ...pins.map(item => item.place),
  ].map(point => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  const [initialCenter] =
    useState<[number, number]>(() =>
      points[0]
        ? [
            points[0].longitude,
            points[0].latitude,
          ]
        : [108.2208, 16.0678],
    );

  const key = JSON.stringify([
    travelMode,
    points,
    totalStops === pins.length,
  ]);
  const current =
    loaded?.key === key ? loaded : null;

  const road = current?.road ?? null;

  const status =
    points.length < 2
      ? 'Các điểm theo thứ tự lịch trình'
      : totalStops !== pins.length
        ? 'Nối thẳng các điểm có tọa độ · còn điểm thiếu tọa độ'
        : travelMode === 'two_wheeler'
          ? 'Nối thẳng thứ tự · chưa có tuyến xe máy'
          : current?.failed
            ? 'Chưa tải được tuyến · đường nét đứt chỉ nối thứ tự'
            : road
              ? 'Tuyến đường theo thứ tự lịch trình'
              : 'Đang lấy tuyến đường…';
    useEffect(() => {
    let cancelled = false;

    const [
      mode,
      routePoints,
      complete,
    ] = JSON.parse(key) as [
      TravelMode,
      RoutePoint[],
      boolean,
    ];

    if (
      routePoints.length < 2 ||
      !complete ||
      mode === 'two_wheeler'
    ) {
      return;
    }

    void getRouteShape(routePoints, mode)
      .then(shape => {
        if (!cancelled) {
          setLoaded({
            key,
            road: shape,
            failed: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({
            key,
            road: null,
            failed: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const direct: [number, number][] =
    points.map(point => [
      point.longitude,
      point.latitude,
    ]);

  const coordinates = road ?? direct;

  const line: Feature<LineString> | null =
    coordinates.length > 1
      ? {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        }
      : null;

  const boundsKey = JSON.stringify(coordinates);

  const bounds = useMemo<
    [number, number, number, number] | null
  >(() => {
    const all = JSON.parse(boundsKey) as
      [number, number][];

    if (!all.length) return null;

    const xs = all.map(point => point[0]);
    const ys = all.map(point => point[1]);

    return [
      Math.min(...xs) - 0.001,
      Math.min(...ys) - 0.001,
      Math.max(...xs) + 0.001,
      Math.max(...ys) + 0.001,
    ];
  }, [boundsKey]);

  useEffect(() => {
    if (
      ready &&
      layout.width > 0 &&
      layout.height > 0 &&
      bounds
    ) {
      camera.current?.fitBounds(bounds, {
        padding: {
          top: 35,
          right: 35,
          bottom: 35,
          left: 35,
        },
        bearing: 0,
        pitch: 0,
        duration: 350,
      });
    }
  }, [
    ready,
    layout.width,
    layout.height,
    bounds,
  ]);

  return (
    <View
      collapsable={false}
      style={{
        flex: 1,
        backgroundColor: '#EAF2F4',
      }}
    >
      <Map
        style={{ flex: 1 }}
        androidView="texture"
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        attribution
        onLayout={event => {
          const {
            width,
            height,
          } = event.nativeEvent.layout;

          setLayout(previous =>
            previous.width === width &&
            previous.height === height
              ? previous
              : { width, height },
          );
        }}
        onDidFinishLoadingMap={() =>
          setReady(true)
        }
        onDidFailLoadingMap={() =>
          onError(
            'Chưa tải được bản đồ OpenFreeMap. Kiểm tra kết nối mạng.',
          )
        }
      >
        <Camera
          ref={camera}
          center={initialCenter}
          zoom={11}
        />

        {line && (
          <GeoJSONSource
            id="trip-overview-route"
            data={line}
          >
            {road && (
                            <Layer
                key="trip-overview-casing"
                id="trip-overview-casing"
                type="line"
                paint={{
                  'line-color': '#FFFFFF',
                  'line-width': 8,
                }}
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
              />
            )}

                        <Layer
              key="trip-overview-line"
              id="trip-overview-line"
              type="line"
              paint={
                road
                  ? {
                      'line-color': '#1686C7',
                      'line-width': 5,
                    }
                  : {
                      'line-color': '#7C8EA5',
                      'line-width': 3,
                      'line-dasharray': [2, 2],
                    }
              }
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </GeoJSONSource>
        )}

        {origin &&
          validRoutePoint(origin) && (
            <Marker
              id="trip-origin"
              lngLat={[
                origin.longitude,
                origin.latitude,
              ]}
            >
              <View
                style={{
                  backgroundColor: '#334155',
                  padding: 7,
                  borderRadius: 15,
                  borderWidth: 2,
                  borderColor: '#FFF',
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

        {pins.map(({ place, number }) => (
          <Marker
            key={`${place.id}-${number}`}
            id={`trip-place-${number}`}
            lngLat={[
              place.longitude,
              place.latitude,
            ]}
          >
            <View
              accessibilityLabel={
                `${number}. ${place.name}`
              }
              style={{
                minWidth: 30,
                height: 30,
                paddingHorizontal: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#008577',
                borderRadius: 15,
                borderWidth: 2,
                borderColor: '#FFF',
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: 13,
                }}
              >
                {number}
              </Text>
            </View>
          </Marker>
        ))}
      </Map>

      <Text
        style={{
          padding: 7,
          fontSize: 11,
          color: '#526579',
          backgroundColor: '#F4F8FB',
        }}
      >
        {status}
      </Text>
    </View>
  );
}