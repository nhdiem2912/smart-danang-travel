import { getTripLocation } from './trip-location';
import {
  finishLeg,
  saveLeg,
} from './trip-session';
import { requestLegStart } from './trip-start-prompt';
import { assertCanStart } from './trip-time-policy';

import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import type { Feature, LineString } from 'geojson';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  queueRoutingRequest,
} from './trip-routing';

import { findPlaceById } from '@/data/places.local';
import { formatTravelTime, LegTracker } from './trip-metrics';
import type { DraftStop, LegResult, TravelMode } from './trip-model';
import { TripResultsSheet } from './trip-results-sheet';
import {
  buildNavigation,
  TurnNavigator,
  type NavFix,
  type NavigationRoute,
  type TurnGuidance,
} from './turn-guidance';
import { tripStore } from './use-trip-draft';

type Props = {
  stops: DraftStop[];
  travelMode: TravelMode;
  onClose: () => void;
};

type Phase = 'loading' | 'ready' | 'paused' | 'arrived' | 'error';
type Point = [number, number];
type Bounds = [number, number, number, number];
type CameraMode = 'follow' | 'north' | 'overview' | 'free';

type Route = {
  distance: number;
  duration: number;
  geometry: LineString;
  navigation: NavigationRoute;
};

type Position = NavFix & {
  speed: number | null;
  course: number | null;
};

type Compass = {
  angle: number;
  magnetic: boolean;
  accuracy: number;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
let lastRouteRequestAt = 0;

function normalize(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function positionFrom(location: Location.LocationObject): Position {
  const { longitude, latitude, accuracy, speed, heading } =
    location.coords;

  return {
    point: [longitude, latitude],
    accuracy,
    timestamp: location.timestamp,
    speed,
    course:
      heading !== null &&
      heading >= 0 &&
      Number.isFinite(heading)
        ? normalize(heading)
        : null,
  };
}
function accurateFix(
  fix: Position | null,
): boolean {
  return (
    !!fix &&
    fix.accuracy !== null &&
    Number.isFinite(fix.accuracy) &&
    fix.accuracy >= 0 &&
    fix.accuracy <= 35 &&
    Math.abs(Date.now() - fix.timestamp) <= 15000
  );
}
function distanceLabel(meters: number) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

function validPoint(value: unknown): value is Point {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

function readRoute(value: unknown): Route {
  const result = value as {
    code?: string;
    routes?: {
      distance?: number;
      duration?: number;
      geometry?: LineString;
    }[];
  } | null;

  const route = result?.routes?.[0];

  if (
    result?.code !== 'Ok' ||
    !route ||
    typeof route.distance !== 'number' ||
    !Number.isFinite(route.distance) ||
    route.distance < 0 ||
    typeof route.duration !== 'number' ||
    !Number.isFinite(route.duration) ||
    route.duration < 0 ||
    route.geometry?.type !== 'LineString' ||
    !Array.isArray(route.geometry.coordinates) ||
    route.geometry.coordinates.length < 2 ||
    !route.geometry.coordinates.every(validPoint)
  ) {
    throw new Error('Dịch vụ chưa trả về tuyến hợp lệ.');
  }

  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
    navigation: buildNavigation(value),
  };
}

function distanceBetween(a: Point, b: Point): number {
  const radians = Math.PI / 180;
  const h =
    Math.sin((b[1] - a[1]) * radians / 2) ** 2 +
    Math.cos(a[1] * radians) *
      Math.cos(b[1] * radians) *
      Math.sin((b[0] - a[0]) * radians / 2) ** 2;

  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function routeBounds(route: Route): Bounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const coordinate of route.geometry.coordinates) {
    west = Math.min(west, coordinate[0]);
    south = Math.min(south, coordinate[1]);
    east = Math.max(east, coordinate[0]);
    north = Math.max(north, coordinate[1]);
  }

  const x = Math.max((east - west) * 0.15, 0.002);
  const y = Math.max((north - south) * 0.15, 0.002);

  return [west - x, south - y, east + x, north + y];
}



function Control({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.control,
        active && styles.controlActive,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={active ? '#FFFFFF' : '#23404A'}
      />
    </Pressable>
  );
}

export default function TripGuidance({
  stops,
  travelMode,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width > height;

  const [plan] = useState(() => [...stops]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<TravelMode>(travelMode);
  const [retry, setRetry] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [route, setRoute] = useState<Route | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [saving, setSaving] = useState(false);
  const [gpsCheckTime, setGpsCheckTime] = useState<number | null>(null);
  const [compass, setCompass] = useState<Compass | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [mapBearing, setMapBearing] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [details, setDetails] = useState(false);
  const [topHeight, setTopHeight] = useState(110);
  const [bottomHeight, setBottomHeight] = useState(190);
  const [guidance, setGuidance] =
    useState<TurnGuidance | null>(null);
  const [savedResult, setSavedResult] =
    useState<LegResult | null>(null);

  const [measured, setMeasured] = useState<{
    seconds: number;
    meters: number | null;
  }>({ seconds: 0, meters: null });

  const camera = useRef<CameraRef | null>(null);
    const headingLogAt = useRef(0);
  const headingWatcher =
    useRef<Location.LocationSubscription | null>(null);
  const navigator = useRef<TurnNavigator | null>(null);
  const lastFix = useRef<Position | null>(null);
  const tracker = useRef(new LegTracker());
  const trackedStopId = useRef<string | null>(null);
  const token = useRef(0);
    const saveBusy = useRef(false);
  const leaving = useRef(false);

  const sessionId = useRef<string | null>(null);

  const locationRequest =
    useRef<AbortController | null>(null);

  const persist = useCallback(() => {
    const id = trackedStopId.current;
    const session = sessionId.current;

    if (!id || !session || saveBusy.current) {
      return Promise.resolve();
    }

    return saveLeg(
      id,
      session,
      tracker.current.checkpoint(),
    );
  }, []);
  const watcher =
    useRef<Location.LocationSubscription | null>(null);
  const request = useRef<AbortController | null>(null);

  const stop = plan[index];
  const place = stop ? findPlaceById(stop.placeId) : undefined;

  const destination: Point | null =
    place?.coordinates_valid &&
    validPoint([place.longitude, place.latitude])
      ? [place.longitude, place.latitude]
      : null;

    const stopWork = useCallback(() => {
    tracker.current.pause();

    locationRequest.current?.abort();
    locationRequest.current = null;

    void persist().catch(error =>
      setError(
        error instanceof Error
          ? error.message
          : 'Chưa lưu được chặng đang dở.',
      ),
    );

    headingWatcher.current?.remove();
    headingWatcher.current = null;

    token.current += 1;

    watcher.current?.remove();
    watcher.current = null;

    request.current?.abort();
    request.current = null;
  }, [persist]);

  useFocusEffect(
    useCallback(() => {
      stopWork();
      const current = token.current;
      const valid = () => token.current === current;

      async function start() {
        console.info('[SDT_ROUTE] Bắt đầu yêu cầu tuyến', {
          attempt: retry,
          leg: index + 1,
          mode,
        });

        setPhase('loading');
        setError('');
        setMapError('');
        setRoute(null);
        setPosition(null);
        setSaving(false);
        setCompass(null);
        setCameraMode('follow');
        setGpsCheckTime(Date.now());

        navigator.current = null;
        lastFix.current = null;
        setGuidance(null);

        if (mode === 'two_wheeler') {
          setPhase('paused');
          return;
        }

        try {
          const target = plan[index];

          if (trackedStopId.current !== target?.id) {
            tracker.current = new LegTracker();
            trackedStopId.current = target?.id ?? null;
            setSavedResult(null);
            setMeasured({ seconds: 0, meters: null });
          }

          const targetPlace = target
            ? findPlaceById(target.placeId)
            : undefined;

          if (
            !targetPlace?.coordinates_valid ||
            !validPoint([
              targetPlace.longitude,
              targetPlace.latitude,
            ])
          ) {
            throw new Error('Điểm đến không có tọa độ hợp lệ.');
          }

                    let existing =
            tripStore.getSnapshot().draft?.stops.find(
              item => item.id === target.id,
            );

          if (
            !existing ||
            (existing.completed && !existing.progress)
          ) {
            throw new Error(
              'Điểm này đã bị xóa hoặc hoàn tất. Hãy quay lại danh sách.',
            );
          }

          if (!existing.progress) {
            const started = await requestLegStart(
  target.id,
  mode,
  valid,
);

if (!valid()) return;

if (!started) {
  onClose();
  return;
}

const startedStop = started.stops.find(
  item => item.progress,
);

if (startedStop?.id !== target.id) {
  const nextIndex = plan.findIndex(
    item => item.id === startedStop?.id,
  );

  if (nextIndex >= 0) {
    setIndex(nextIndex);
  } else {
    onClose();
  }

  return;
}

            if (!valid()) return;

            existing =
              tripStore.getSnapshot().draft?.stops.find(
                item => item.id === target.id,
              );
          }

          const progress = existing?.progress;

          if (!progress || progress.travelMode !== mode) {
            throw new Error(
              'Phương tiện của chặng đã thay đổi. Quay lại danh sách.',
            );
          }

          if (sessionId.current !== progress.id) {
            tracker.current.restore(progress.checkpoint);
            sessionId.current = progress.id;

            setMeasured({
              seconds: tracker.current.seconds(),
              meters: tracker.current.gpsMeters(),
            });
          }

          let permission =
            await Location.getForegroundPermissionsAsync();

          if (!valid()) return;

          if (
            permission.status !== 'granted' &&
            permission.canAskAgain
          ) {
            permission =
              await Location.requestForegroundPermissionsAsync();
          }

          if (!valid()) return;

          if (permission.status !== 'granted') {
            throw new Error(
              'Hãy cấp quyền vị trí trong cài đặt ứng dụng rồi thử lại.',
            );
          }

          // Cảm biến hướng không chặn việc lấy GPS/tính tuyến.
                    void Location.watchHeadingAsync(value => {
            if (!valid()) return;

            const loggedAt = Date.now();

            if (loggedAt - headingLogAt.current >= 2000) {
              headingLogAt.current = loggedAt;

              console.info('[SDT_HEADING]', {
                accuracy: value.accuracy,
                trueHeading: value.trueHeading,
                magHeading: value.magHeading,
              });
            }

            const magnetic = !(
              Number.isFinite(value.trueHeading) &&
              value.trueHeading >= 0
            );

            const raw = magnetic
              ? value.magHeading
              : value.trueHeading;

            if (
              !Number.isFinite(raw) ||
              raw < 0 ||
              value.accuracy < 2
            ) {
              setCompass(null);
              return;
            }

            const angle = normalize(raw);

            setCompass(previous => {
              if (
                !previous ||
                previous.magnetic !== magnetic
              ) {
                return {
                  angle,
                  magnetic,
                  accuracy: value.accuracy,
                };
              }

              // Làm mượt qua cả điểm 359° → 0°.
              const delta =
                ((angle - previous.angle + 540) % 360) - 180;

              return {
                angle: normalize(previous.angle + delta * 0.35),
                magnetic,
                accuracy: value.accuracy,
              };
            });
          })
            .then(subscription => {
              if (valid()) headingWatcher.current = subscription;
              else subscription.remove();
            })
                        .catch(error => {
              if (!valid()) return;

              console.warn(
                '[SDT_HEADING] Không đọc được cảm biến:',
                String(error),
              );

              setCompass(null);
            });

          const gpsEnabled =
            await Location.hasServicesEnabledAsync();

          if (!valid()) return;

          if (!gpsEnabled) {
            throw new Error('Hãy bật Vị trí/GPS trên điện thoại.');
          }

                 const gpsController = new AbortController();
          locationRequest.current = gpsController;

          const location = await getTripLocation(
            gpsController.signal,
          );

          if (
            locationRequest.current === gpsController
          ) {
            locationRequest.current = null;
          }
          if (!valid()) return;

          const origin: Point = [
            location.coords.longitude,
            location.coords.latitude,
          ];

          if (!validPoint(origin)) {
            throw new Error('GPS chưa trả về tọa độ hợp lệ.');
          }

          const initialFix = positionFrom(location);
          lastFix.current = initialFix;
          setPosition(initialFix);

          const subscription =
            await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                distanceInterval: 0,
                timeInterval: 2000,
              },
              update => {
                if (!valid()) return;

                const point: Point = [
                  update.coords.longitude,
                  update.coords.latitude,
                ];

                if (!validPoint(point)) return;

                tracker.current.sample(update, mode);

                const fix = positionFrom(update);
                lastFix.current = fix;
                setPosition(fix);

                              if (
                  navigator.current &&
                  accurateFix(fix)
                ) {
                  setGuidance(
                    navigator.current.update(fix),
                  );
                }
              },
            );

          if (!valid()) {
            subscription.remove();
            return;
          }

          watcher.current = subscription;

          if (Date.now() - lastRouteRequestAt < 1500) {
            throw new Error(
              'Vui lòng đợi vài giây trước khi yêu cầu tuyến mới.',
            );
          }

          lastRouteRequestAt = Date.now();

          const controller = new AbortController();
          request.current = controller;

          const service =
            mode === 'walking' ? 'routed-foot' : 'routed-car';
          const profile =
            mode === 'walking' ? 'foot' : 'driving';

          const url =
            `https://routing.openstreetmap.de/${service}` +
            `/route/v1/${profile}/` +
            `${origin[0]},${origin[1]};` +
            `${targetPlace.longitude},${targetPlace.latitude}` +
            '?overview=full&geometries=geojson&steps=true';

          let timedOut = false;

          const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, 25000);

          let nextRoute: Route;

          try {
                                    const response =
              await queueRoutingRequest(() => {
                if (
                  controller.signal.aborted ||
                  !valid()
                ) {
                  throw new Error(
                    'Yêu cầu tuyến đã hủy.',
                  );
                }

                return fetch(url, {
                  signal: controller.signal,
                  headers: {
                    Accept: 'application/json',
                  },
                });
              });

            if (!response.ok) {
              throw new Error(
                response.status === 429
                  ? 'Dịch vụ đang giới hạn yêu cầu. Hãy đợi rồi thử lại.'
                  : `Không tải được tuyến (HTTP ${response.status}).`,
              );
            }

            nextRoute = readRoute(await response.json());
          } catch (e) {
            if (timedOut) {
              throw new Error(
                'Dịch vụ chưa phản hồi sau 25 giây. Hãy thử lại.',
              );
            }
            throw e;
          } finally {
            clearTimeout(timeout);

            if (request.current === controller) {
              request.current = null;
            }
          }

          if (!valid()) return;

          if (AppState.currentState !== 'active') {
            stopWork();
            setPhase('paused');
            return;
          }
const liveDraft =
  tripStore.getSnapshot().draft;

const liveTarget = liveDraft?.stops.find(
  item => item.id === target.id,
);

if (!liveDraft || !liveTarget) {
  throw new Error(
    'Chặng đã thay đổi. Hãy quay lại danh sách.',
  );
}

assertCanStart(
  liveDraft,
  liveTarget,
  Date.now(),
  nextRoute.duration,
);
          tracker.current.resume();
          tracker.current.sample(location, mode);

          const nextNavigator = new TurnNavigator(
            nextRoute.navigation,
            mode === 'walking',
          );

          navigator.current = nextNavigator;

                             if (
            lastFix.current &&
            accurateFix(lastFix.current)
          ) {
            setGuidance(
              nextNavigator.update(lastFix.current),
            );
          } 

          setRoute(nextRoute);
          setPhase('ready');
        } catch (e) {
          if (!valid()) return;

          console.warn(
            '[SDT_ROUTE] Không mở được tuyến:',
            e instanceof Error ? e.message : String(e),
          );

          stopWork();

          setError(
            e instanceof Error
              ? e.message
              : 'Không lấy được vị trí hoặc tuyến đường.',
          );
          setPhase('error');
        }
      }

      void start();

      return stopWork;
    }, [index, mode, plan, retry, stopWork, onClose]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      state => {
                if (
          state !== 'active' &&
          (phase === 'ready' || phase === 'loading')
        ) {
          stopWork();
          setPhase('paused');
        }
      },
    );

    return () => subscription.remove();
  }, [phase, stopWork]);

   useEffect(() => {
    if (phase !== 'ready') return;

    const refresh = () => {
      setGpsCheckTime(Date.now());

      setMeasured({
        seconds: tracker.current.seconds(),
        meters: tracker.current.gpsMeters(),
      });

      if (
        navigator.current &&
        lastFix.current &&
        accurateFix(lastFix.current)
      ) {
        setGuidance(
          navigator.current.update(lastFix.current),
        );
      }
    };

    refresh();

    const interval = setInterval(refresh, 1000);

    return () => clearInterval(interval);
  }, [phase]);
  

  const bounds = useMemo(
    () => (route ? routeBounds(route) : null),
    [route],
  );

  const line = useMemo<Feature<LineString> | null>(
    () =>
      route
        ? {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          }
        : null,
    [route],
  );

  const directDistance =
    position && destination
      ? distanceBetween(position.point, destination)
      : null;

  const heading = useMemo(() => {
    if (phase !== 'ready') return null;

    const fresh =
      position &&
      gpsCheckTime !== null &&
      Math.abs(gpsCheckTime - position.timestamp) <= 7000;

    // Khi đang di chuyển, ưu tiên hướng đi thực tế từ GPS.
    if (
      fresh &&
      position.accuracy !== null &&
      position.accuracy <= 25 &&
      position.course !== null &&
      position.speed !== null &&
      position.speed >= (mode === 'walking' ? 1 : 2)
    ) {
      return {
        angle: position.course,
        label: 'Hướng di chuyển GPS',
      };
    }

    // Khi đứng yên, dùng hướng đầu máy nếu cảm biến đủ tin cậy.
    if (compass) {
      return {
        angle: compass.angle,
        label: compass.magnetic
          ? 'Hướng đầu máy · Bắc từ'
          : 'Hướng đầu máy · La bàn',
      };
    }

    return null;
  }, [phase, position, gpsCheckTime, mode, compass]);

  const freshPosition =
    !!position &&
    gpsCheckTime !== null &&
    Math.abs(gpsCheckTime - position.timestamp) <= 15000 &&
    position.accuracy !== null &&
    position.accuracy <= 35;

  const cameraPadding = useMemo(
    () =>
      compact
        ? {
            top: topHeight + insets.top + 20,
            right: width * 0.45,
            bottom: 24,
            left: 24,
          }
        : {
            top: topHeight + insets.top + 24,
            right: 30,
            bottom: bottomHeight + 24,
            left: 30,
          },
    [compact, topHeight, bottomHeight, insets.top, width],
  );

  useEffect(() => {
    if (
      !mapReady ||
      cameraMode !== 'overview' ||
      !bounds
    ) {
      return;
    }

    camera.current?.fitBounds(bounds, {
      padding: cameraPadding,
      bearing: 0,
      pitch: 0,
      duration: 450,
    });
  }, [mapReady, cameraMode, bounds, cameraPadding]);

  useEffect(() => {
    if (
      !mapReady ||
      !freshPosition ||
      !position ||
      (cameraMode !== 'follow' && cameraMode !== 'north')
    ) {
      return;
    }

    camera.current?.easeTo({
      center: position.point,
      zoom: 16.8,
      bearing:
        cameraMode === 'follow'
          ? heading?.angle ?? 0
          : 0,
      pitch: 0,
      padding: cameraPadding,
      duration: 400,
    });
  }, [
    mapReady,
    freshPosition,
    position,
    cameraMode,
    heading,
    cameraPadding,
  ]);

  async function confirmArrival() {
    if (
      !stop ||
      !route ||
      saveBusy.current ||
      phase !== 'ready'
    ) {
      return;
    }

    let result: LegResult;

    try {
      result = tracker.current.result(
        mode,
        route.distance,
        route.duration,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Chưa có số đo chặng.',
      );
      return;
    }

    saveBusy.current = true;
    stopWork();

    const current = token.current;
    setPhase('paused');
    setSaving(true);
    setError('');

    try {
            if (!sessionId.current) {
        throw new Error('Chưa có chặng đang đi.');
      }

      await finishLeg(
        stop.id,
        sessionId.current,
        result,
      );
      if (token.current === current) {
        setSavedResult(result);
        setPhase('arrived');
      }
    } catch (e) {
      if (token.current === current) {
        setError(
          e instanceof Error
            ? e.message
            : 'Chưa lưu được check-in.',
        );
      }
    } finally {
      saveBusy.current = false;

      if (token.current === current) {
        setSaving(false);
      }
    }
  }

  function pause() {
    stopWork();
    setPhase('paused');
  }

    async function close() {
    if (leaving.current || saveBusy.current) return;

    leaving.current = true;

    stopWork();
    setPhase('paused');
    setSaving(true);

    try {
      await persist();
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Chưa lưu được chặng.',
      );
    } finally {
      leaving.current = false;
      setSaving(false);
    }
  }
    useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          void close();
          return true;
        },
      );

    return () => subscription.remove();
  });

  useEffect(() => {
    if (phase !== 'ready') return;

    const timer = setInterval(() => {
      void persist().catch(error =>
        setError(
          error instanceof Error
            ? error.message
            : 'Chưa lưu được chặng đang đi.',
        ),
      );
    }, 10000);

    return () => clearInterval(timer);
  }, [phase, persist]);
  function recenter() {
    if (!mapReady || !position || !freshPosition) {
      setError(
        'Chưa có vị trí GPS mới đủ chính xác để về giữa.',
      );
      return;
    }

    setError('');
    setCameraMode('follow');

    // Gọi trực tiếp để nút vẫn hoạt động khi mode đã là follow.
    camera.current?.easeTo({
      center: position.point,
      zoom: 16.8,
      bearing: heading?.angle ?? 0,
      pitch: 0,
      padding: cameraPadding,
      duration: 450,
    });
  }
    const gpsLimited =
    phase === 'ready' &&
    !accurateFix(position);

  const matched =
    phase === 'ready' &&
    !gpsLimited &&
    (
      guidance?.status === 'ok' ||
      guidance?.status === 'near'
    );

  const remaining = matched
    ? guidance?.remainingMeters ?? null
    : null;

  const estimatedSeconds = route
    ? remaining !== null
      ? route.duration * remaining / route.navigation.length
      : route.duration
    : null;

  const eta =
    gpsCheckTime !== null &&
    estimatedSeconds !== null &&
    phase === 'ready'
      ? new Date(
          gpsCheckTime + estimatedSeconds * 1000,
        ).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

      // Xem trước bước tiếp theo, không coi là đã xác nhận tiến trình.
  const previewStep =
    phase === 'ready' &&
    !matched &&
        !gpsLimited &&
    guidance?.status !== 'weak' &&
    guidance?.status !== 'off-route'
      ? route?.navigation.steps[1] ?? null
      : null;
  const warning =
    gpsLimited ||
    phase === 'error' ||
    (
      phase === 'ready' &&
      (
        guidance?.status === 'weak' ||
        guidance?.status === 'off-route'
      )
    );

  const headerText =
    mode === 'two_wheeler'
      ? 'Chọn ô tô hoặc đi bộ để xem tuyến'
      : phase === 'loading'
        ? 'Đang lấy vị trí và tìm đường…'
        : phase === 'paused'
          ? saving
            ? 'Đang lưu kết quả chặng…'
            : 'Đã tạm dừng'
          : phase === 'error'
            ? error || 'Chưa mở được tuyến'
                      : phase === 'arrived'
              ? 'Đã lưu check-in'
              : gpsLimited
                ? (
                    'Vị trí ước lượng' +
                    (
                      position?.accuracy != null
                        ? ` ±${Math.round(position.accuracy)} m`
                        : ''
                    ) +
                    '. Đang xem tuyến, chờ GPS chính xác để chỉ dẫn.'
                  )
              : previewStep
                ? previewStep.text
                : guidance?.text ??
                  'Đang xác định vị trí trên tuyến…';

  const turnDistance =
    previewStep
      ? distanceLabel(previewStep.at)
      : matched &&
          guidance?.status === 'ok' &&
          guidance.turnMeters !== null
        ? guidance.turnMeters <= 20
          ? 'Phía trước'
          : distanceLabel(guidance.turnMeters)
        : phase === 'loading'
          ? 'Đang tìm'
          : matched
            ? 'Gần đến'
            : 'Chờ vị trí';
  return (
    <View style={styles.screen} collapsable={false}>
      <View
        style={StyleSheet.absoluteFill}
        collapsable={false}
      >
        <Map
          androidView="texture"
          style={styles.map}
          mapStyle={MAP_STYLE}
          attribution
          attributionPosition={{
            bottom: bottomHeight + 18,
            right: 12,
          }}
          logoPosition={{
            bottom: bottomHeight + 18,
            left: 12,
          }}
          onDidFinishLoadingStyle={() => {
            setMapReady(true);
            setMapError('');
          }}
          onDidFailLoadingMap={() =>
            setMapError(
              'Chưa tải được nền bản đồ. Kiểm tra Internet rồi mở lại màn hình.',
            )
          }
          onRegionWillChange={event => {
            if (event.nativeEvent.userInteraction) {
              setCameraMode('free');
            }
          }}
          onRegionIsChanging={event => {
            const value = event.nativeEvent.bearing;

            setMapBearing(previous =>
              Math.abs(previous - value) > 0.5
                ? value
                : previous,
            );
          }}
        >
          <Camera
            ref={camera}
            initialViewState={{
              center: [108.2208, 16.0678],
              zoom: 13,
            }}
          />

          {line && (
            <GeoJSONSource id="sdt-route" data={line}>
              <Layer
                id="sdt-route-casing"
                type="line"
                paint={{
                  'line-color': '#FFFFFF',
                  'line-width': 10,
                }}
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
              />
              <Layer
                id="sdt-route-line"
                type="line"
                paint={{
                  'line-color': '#2563EB',
                  'line-width': 6,
                }}
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
              />
            </GeoJSONSource>
          )}

          {destination && (
            <Marker
              id="destination"
              lngLat={destination}
            >
              <View style={styles.destination}>
                <Ionicons
                  name="flag"
                  size={18}
                  color="#FFFFFF"
                />
              </View>
            </Marker>
          )}

          {position && (
            <Marker
              id="current-position"
              lngLat={position.point}
            >
              <View
                style={[
                  styles.positionHalo,
                  !freshPosition && styles.disabled,
                ]}
                accessibilityLabel={
                  heading?.label ??
                  'Vị trí GPS, chưa xác định hướng'
                }
              >
                <View style={styles.positionCore}>
                  {heading && freshPosition ? (
                    <View
                      style={{
                        transform: [
                          {
                            rotate:
                              `${heading.angle - mapBearing}deg`,
                          },
                        ],
                      }}
                    >
                      <View style={styles.arrow} />
                    </View>
                  ) : (
                    <View style={styles.dot} />
                  )}
                </View>
              </View>
            </Marker>
          )}
        </Map>
      </View>

      <View
        collapsable={false}
        onLayout={event =>
          setTopHeight(event.nativeEvent.layout.height)
        }
        style={[
          styles.header,
          {
            top: insets.top + 10,
            left: insets.left + 12,
            right: compact
              ? width * 0.46
              : insets.right + 12,
          },
          warning && styles.headerWarning,
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.turnTile}>
            {phase === 'loading' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.turnSymbol}>
                                {matched
                  ? guidance?.icon ?? '↑'
                  : previewStep?.icon ?? '•'}
              </Text>
            )}

            <Text style={styles.turnDistance}>
              {turnDistance}
            </Text>
          </View>

          <View style={styles.headerCopy}>
            <Text
              style={styles.legLabel}
              numberOfLines={1}
            >
              Chặng {index + 1}/{plan.length}
              {' · '}
              {place?.name ?? 'Điểm đến'}
            </Text>

            <Text
              accessibilityLiveRegion="polite"
                           style={styles.instruction}
              numberOfLines={2}
            >
              {headerText}
            </Text>
                        {previewStep && (
              <Text
                style={{
                  color: '#D5EBED',
                  fontSize: 11,
                  lineHeight: 15,
                }}
              >
                Xem trước từ đầu tuyến · chưa xác nhận tiến trình GPS
              </Text>
            )}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.mapControls,
          {
            right: insets.right + 14,
            top: compact
              ? insets.top + 14
              : insets.top + topHeight + 28,
          },
        ]}
      >
        <Control
          icon="compass-outline"
          label="Đổi Bắc ở trên / Theo hướng đi"
          active={cameraMode === 'north'}
          onPress={() =>
            setCameraMode(value =>
              value === 'north' ? 'follow' : 'north',
            )
          }
        />

        <Control
          icon="map-outline"
          label="Xem toàn bộ tuyến"
          active={cameraMode === 'overview'}
          onPress={() => setCameraMode('overview')}
        />

                <Control
          icon="locate-outline"
          label="Về giữa"
          active={cameraMode === 'follow'}
          onPress={recenter}
        />
      </View>

      <View
        collapsable={false}
        onLayout={event =>
          setBottomHeight(event.nativeEvent.layout.height)
        }
        style={[
          styles.bottom,
          {
                        bottom: 8,
            left: compact
              ? width * 0.57
              : insets.left + 10,
            right: insets.right + 10,
          },
        ]}
      >
        <ScrollView
          style={{
            maxHeight: compact
              ? height * 0.62
              : height * 0.48,
          }}
          contentContainerStyle={styles.bottomContent}
          showsVerticalScrollIndicator={details}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <Text style={styles.minutes}>
                {estimatedSeconds === null
                  ? '—'
                  : estimatedSeconds < 60
                    ? 'Dưới 1 phút'
                    : `${Math.ceil(
                        estimatedSeconds / 60,
                      )} phút`}
              </Text>

              <Text style={styles.subtitle}>
                {route
                  ? distanceLabel(
                      remaining ?? route.distance,
                    )
                  : 'Chưa có tuyến'}
                {eta ? ` · ${eta}` : ''}
              </Text>

              <Text style={styles.estimateLabel}>
                {remaining !== null
                  ? 'Ước tính theo tiến trình · chưa xét giao thông'
                  : 'Dự kiến ban đầu · chưa xét giao thông'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={close}
              disabled={saving}
              style={[
                styles.exitButton,
                saving && styles.disabled,
              ]}
            >
              <Ionicons
                name="close"
                size={19}
                color="#B42318"
              />
              <Text style={styles.exitText}>Xem lộ trình</Text>
            </Pressable>
          </View>

          <Text style={styles.headingLabel}>
            {cameraMode === 'overview'
              ? 'Toàn tuyến'
              : cameraMode === 'north'
                ? 'Bắc ở trên'
                : cameraMode === 'free'
                  ? 'Đang xem bản đồ tự do'
                  : 'Theo vị trí'}
            {' · '}
            {heading?.label ?? 'Chưa có hướng tin cậy'}
          </Text>

          {mode === 'two_wheeler' ? (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setMode('driving')}
              >
                <Text style={styles.primaryText}>Ô tô</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => setMode('walking')}
              >
                <Text style={styles.secondaryText}>Đi bộ</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                disabled={saving}
                style={[
                  styles.secondaryButton,
                  saving && styles.disabled,
                ]}
                onPress={
                  phase === 'ready' || phase === 'loading'
                    ? pause
                    : () => setRetry(value => value + 1)
                }
              >
                <Ionicons
                  name={
                    phase === 'ready' || phase === 'loading'
                      ? 'pause'
                      : 'play'
                  }
                  size={16}
                  color="#23404A"
                />

                <Text style={styles.secondaryText}>
                  {phase === 'ready' || phase === 'loading'
                    ? 'Tạm dừng'
                    : 'Thử lại'}
                </Text>
              </Pressable>

              <Pressable
                disabled={phase !== 'ready' || saving}
                style={[
                  styles.primaryButton,
                  (phase !== 'ready' || saving) &&
                    styles.disabled,
                ]}
                onPress={() => void confirmArrival()}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.primaryText}>
                  {saving ? 'Đang lưu…' : 'Đã đến nơi'}
                </Text>
              </Pressable>
            </View>
          )}

          {!!(error || mapError) && (
            <Text style={styles.error}>
              {error || mapError}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            style={styles.detailsButton}
            onPress={() => setDetails(value => !value)}
          >
            <Text style={styles.detailsLabel}>
              {details ? 'Thu gọn' : 'Chi tiết chuyến đi'}
            </Text>
            <Ionicons
              name={details ? 'chevron-up' : 'chevron-down'}
              size={17}
              color="#64748B"
            />
          </Pressable>

          {details && (
            <View style={styles.details}>
              <Text style={styles.detailText}>
                {headerText}
              </Text>

              <Text style={styles.detailText}>
                Đã đi: {formatTravelTime(measured.seconds)}
              </Text>

              <Text style={styles.detailText}>
                GPS ước tính:{' '}
                {measured.meters === null
                  ? 'Đang thu thập'
                  : distanceLabel(measured.meters)}
              </Text>

              {position && (
                <Text style={styles.detailText}>
                  Sai số GPS:{' '}
                  {position.accuracy === null
                    ? 'chưa rõ'
                    : `${Math.round(
                        position.accuracy,
                      )} m`}
                  {' · Mẫu cách đây '}
                  {Math.max(
                    0,
                    Math.floor(
                      ((gpsCheckTime ??
                        position.timestamp) -
                        position.timestamp) / 1000,
                    ),
                  )}
                  {' giây'}
                </Text>
              )}

              {directDistance !== null && (
                <Text style={styles.detailText}>
                  Khoảng cách thẳng tới đích:{' '}
                  {distanceLabel(directDistance)}
                </Text>
              )}

              <Text style={styles.detailText}>
                Hướng đầu máy không xác nhận đã đi qua ngã rẽ.
                Tuyến xe máy chưa được hỗ trợ.
              </Text>

              <Pressable
                disabled={phase !== 'ready' || saving}
                style={[
                  styles.secondaryButton,
                  (phase !== 'ready' || saving) &&
                    styles.disabled,
                ]}
                onPress={() =>
                  setRetry(value => value + 1)
                }
              >
                <Ionicons
                  name="refresh"
                  size={17}
                  color="#23404A"
                />
                <Text style={styles.secondaryText}>
                  Tính lại tuyến từ đây
                </Text>
              </Pressable>

              <Text style={styles.detailText}>
                OpenFreeMap / OpenStreetMap
                {' · '}
                Tuyến OSRM / FOSSGIS
              </Text>

              <Pressable
                onPress={() => {
                  void Linking.openURL(
                    'https://www.openstreetmap.org/fixthemap',
                  ).catch(() =>
                    setMapError(
                      'Không mở được trang báo lỗi bản đồ.',
                    ),
                  );
                }}
              >
                <Text style={styles.link}>
                  Báo lỗi dữ liệu bản đồ
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
      {position && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về giữa và theo vị trí của tôi"
          onPress={recenter}
          style={{
            position: 'absolute',
            left: insets.left + 16,
            bottom: bottomHeight + 26,
            zIndex: 25,
            elevation: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
          }}
        >
          <Ionicons
            name="navigate"
            size={19}
            color="#175564"
          />
          <Text
            style={{
              color: '#175564',
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            Về giữa
          </Text>
        </Pressable>
      )}
      {phase === 'arrived' && savedResult && (
        <TripResultsSheet
          result={savedResult}
          placeName={place?.name}
          nextName={
            plan[index + 1]
              ? findPlaceById(
                  plan[index + 1].placeId,
                )?.name
              : undefined
          }
          onContinue={
            index + 1 < plan.length
              ? () => setIndex(value => value + 1)
              : undefined
          }
          onClose={close}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E8EEF0',
    overflow: 'hidden',
  },
  map: { flex: 1 },
    header: {
    position: 'absolute',
    backgroundColor: '#175564',
    borderRadius: 18,
    padding: 12,
    zIndex: 20,
    elevation: 4,
  },
  headerWarning: { backgroundColor: '#735522' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
   turnTile: {
    width: 62,
    alignItems: 'center',
    gap: 2,
  },
    turnSymbol: {
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 38,
  },
   turnDistance: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerCopy: { flex: 1, gap: 5 },
  legLabel: {
    color: '#D5EBED',
    fontSize: 11,
    fontWeight: '600',
  },
    instruction: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  mapControls: {
    position: 'absolute',
    zIndex: 20,
    gap: 10,
    alignItems: 'center',
  },
  control: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  controlActive: { backgroundColor: '#175564' },
  destination: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D84C4C',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37,99,235,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionCore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2563EB',
  },
  dot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  bottom: {
    position: 'absolute',
    zIndex: 30,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  bottomContent: {
    padding: 13,
    gap: 8,
  },
    summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryCopy: { flex: 1, gap: 3 },
   minutes: {
    color: '#176949',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
  },
  subtitle: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  estimateLabel: { color: '#64748B', fontSize: 10 },
  exitButton: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FEECEB',
    borderRadius: 24,
  },
  exitText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '700',
  },
  headingLabel: { color: '#64748B', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#176949',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#EEF3F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#23404A',
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: { opacity: 0.45 },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 3,
  },
  detailsLabel: { color: '#64748B', fontSize: 12 },
  details: {
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  detailText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: '#175564',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});