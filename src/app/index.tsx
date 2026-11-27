import {
  HOME_BANNERS,
} from '@/features/home/home-banners';

import {
  useAccount,
} from '@/features/account/account-store';

import {
  usePlacesCatalog,
} from '@/data/use-places-catalog';
import {
  useHomeAvatar,
} from '@/features/account/use-account-avatar';
import EventDirections from '@/features/home/event-directions';
import { getEventPlace } from '@/features/home/home-events';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import oldHomeHtml from '../../data/sdt-html';

import {
  findPlaceById,
} from '@/data/places.local';

import type { Place } from '@/data/place.types';

import { useTravelerProfile } from '@/features/profile/profile-context';
import { useSettingsColors } from '@/features/settings/settings-colors';
import { useAppSettings } from '@/features/settings/settings-store';

import { AddStopSheet } from '@/features/discovery/add-stop-sheet';
import { PlaceDetailsSheet } from '@/features/discovery/place-details-sheet';
import { displayDate } from '@/features/discovery/trip-model';
import { hasActiveTrip } from '@/features/discovery/trip-time-policy';
import { useTripDraft } from '@/features/discovery/use-trip-draft';

import { HOME_HTML } from '@/features/home/home-html';

import {
  loadHomeWeather,
  type HomeWeather,
} from '@/features/home/home-weather';

function oldPhoto(key: string): string | null {
  return (
    new RegExp(key + ": '([^']+)'")
      .exec(oldHomeHtml)?.[1] || null
  );
}


const EVENT_ITEMS = [
  {
    id: 'dragon',
    title: 'Cầu Rồng Phun Lửa & Phun Nước',
    when: '21:00 · Lịch tham khảo',
    where: 'Khu vực Cầu Rồng, Đà Nẵng',
    destination: 'Cầu Rồng, Đà Nẵng',
    image: oldPhoto('caurong'),
  },
  {
    id: 'market',
    title: 'Chợ Đêm Sơn Trà & Ẩm Thực',
    when: 'Buổi tối · Lịch tham khảo',
    where: 'Mai Hắc Đế, Sơn Trà',
    destination:
      'Chợ đêm Sơn Trà, Mai Hắc Đế, Đà Nẵng',
    image: oldPhoto('chodem'),
  },
  {
    id: 'cruise',
    title: 'Du Thuyền Sông Hàn Ngắm Cầu Rồng',
    when: 'Theo lịch nhà vận hành',
    where: 'Bến du thuyền sông Hàn',
    destination: 'Bến du thuyền sông Hàn, Đà Nẵng',
    image: oldPhoto('duthuyen'),
  },
  {
    id: 'swing',
    title: 'Cầu Quay Sông Hàn Trình Diễn Quay',
    when: 'Lịch quay cần xác nhận',
    where: 'Cầu Sông Hàn, Đà Nẵng',
    destination: 'Cầu Sông Hàn, Đà Nẵng',
    image: null,
  },
];


const routes = {
  explore: '/explore',
  itinerary: '/itinerary',
  assistant: '/assistant',
  settings: '/settings',
} as const;

export default function HomeScreen() {
  const { user } = useAccount();

const avatar = useHomeAvatar(
  user?.uid ?? null,
  user?.photoURL ?? null,
);
  usePlacesCatalog();

  const c = useSettingsColors();
  const insets = useSafeAreaInsets();

  const { profile } = useTravelerProfile();
  const { settings } = useAppSettings();
  const { draft } = useTripDraft();

  const webview = useRef<WebView<object>>(null);

  const [weather, setWeather] =
    useState<HomeWeather | null>(null);

  const [weatherError, setWeatherError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [detail, setDetail] =
    useState<Place | null>(null);

  const [adding, setAdding] =
    useState<Place | null>(null);
const [directions, setDirections] =
  useState<Place | null>(null);

const [eventDetail, setEventDetail] = useState(false);
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, 15000);

    let alive = true;

    void loadHomeWeather(controller.signal)
      .then(value => {
        if (alive) {
          setWeather(value);
          setWeatherError('');
        }
      })
      .catch(() => {
        if (alive) {
          setWeather(null);
          setWeatherError(
            'Chưa tải được thời tiết · Nhấn làm mới',
          );
        }
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

 const featured = HOME_BANNERS.map(banner => {
  const place = findPlaceById(banner.placeId);

  return {
    ...banner,
    image:
      banner.image ||
      place?.image_url ||
      null,
    placeId: place?.id || null,
    rating: place?.rating ?? null,
  };
});

  const active = draft && hasActiveTrip(draft);

  const payload = {
    name:
  profile?.displayName ||
  user?.name ||
  'Du khách',
avatar,
    colors: c,
    featured,
    events: EVENT_ITEMS,
    weather,
    weatherError,
    tripActive: !!active,

    tripTitle: active
      ? `Chuyến đi ${draft.dayCount} ngày · ${draft.stops.length} địa điểm`
      : 'Bạn chưa có chuyến đi',

    tripNote: active
      ? (
          `${displayDate(draft.startDate)} · ` +
          `${draft.stops.filter(stop => stop.completed).length} điểm đã hoàn thành`
        )
      : 'Chọn ngày → chọn địa điểm → tối ưu lộ trình',
  };

  const serialized = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const script =
    `window.updateHome && window.updateHome(${serialized});true;`;

  useEffect(() => {
    webview.current?.injectJavaScript(script);
  }, [script]);

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: c.background,
      }}
    >
      <WebView<object>
        ref={webview}
        source={{ html: HOME_HTML }}
        originWhitelist={['about:blank']}
        scrollEnabled
        bounces={false}
        onLoadEnd={() => {
          webview.current?.injectJavaScript(script);
        }}
        style={{
          flex: 1,
          backgroundColor: c.background,
        }}
        onMessage={event => {
          console.log('[HOME_CLICK]', event.nativeEvent.data);
  try {
    const message = JSON.parse(
      event.nativeEvent.data,
    );

    if (
      message.action === 'nav' &&
      Object.hasOwn(routes, message.value)
    ) {
      router.navigate(
        routes[
          message.value as keyof typeof routes
        ],
      );
    }

    if (
  message.action === 'place' &&
  typeof message.value === 'string'
) {
  const place = findPlaceById(message.value);

  if (place) {
    router.navigate({
      pathname: '/explore',
      params: {
        placeId: place.id,
        openToken:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
      },
    });
  }
}
    if (
      message.action === 'directions' ||
      message.action === 'event-detail'
    ) {
      const place = getEventPlace(message.value);

      if (!place) {
        Alert.alert(
          'Chưa có địa điểm',
          'Chưa tìm thấy bản ghi tương ứng trong danh mục. Không tự chọn tọa độ gần đúng.',
        );
      } else if (message.action === 'directions') {
        setDetail(null);
        setDirections(place);
      } else {
        setEventDetail(true);
        setDetail(place);
      }
    }

    if (message.action === 'refresh') {
      setAttempt(value => value + 1);
    }

    if (message.action === 'notifications') {
      const notices =
        settings?.inbox.slice(0, 4) || [];

      Alert.alert(
        'Thông báo',
        notices.length
          ? notices
              .map(
                notice =>
                  `${notice.title}\n${notice.body}`,
              )
              .join('\n\n')
          : 'Bạn chưa có thông báo.',
      );
    }
  } catch {
    // Bỏ qua thông điệp không hợp lệ.
  }
}}
      />

      {!!detail && (
  <PlaceDetailsSheet
   place={
  findPlaceById(detail.id) ??
  detail
}
    close={() => setDetail(null)}
    onNavigate={
      eventDetail
        ? () => {
            setDirections(detail);
            setDetail(null);
          }
        : undefined
    }
    onAdd={() => {
      setAdding(detail);
      setDetail(null);
    }}
  />
)}
      {!!directions && (
  <EventDirections
    place={directions}
    close={() => setDirections(null)}
  />
)}
      {!!adding && (
        <AddStopSheet
      place={
  findPlaceById(adding.id) ??
  adding
}
          close={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            router.navigate('/itinerary');
          }}
        />
      )}
    </View>
  );
}