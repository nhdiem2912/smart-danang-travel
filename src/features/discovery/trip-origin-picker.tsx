import {
  usePlacesCatalog,
} from '@/data/use-places-catalog';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  normalizeSearch,
} from '@/data/places.local';

import { getTripLocation } from './trip-location';
import type { TripSettings } from './trip-model';

import {
  requestedHouseNumber,
  searchAddresses,
  type AddressResult,
} from './trip-address-search';

import TripOriginPin from './trip-origin-pin';

import {
  validRoutePoint,
  type RoutePoint,
} from './trip-routing';

import { Action, C, s } from './ui';

type Props = {
  value: TripSettings;
  disabled: boolean;
  onChange: (
    value:
      | TripSettings
      | ((current: TripSettings) => TripSettings)
  ) => void;
  onBusyChange: (value: boolean) => void;
};

export function TripOriginPicker({
  value,
  disabled,
  onChange,
  onBusyChange,
}: Props) {
    const { places } = usePlacesCatalog();
  const [query, setQuery] = useState('');

  const [results, setResults] =
    useState<AddressResult[]>([]);

  const [searched, setSearched] = useState('');

  const [loading, setLoading] =
    useState<'gps' | 'search' | null>(null);

  const [error, setError] = useState('');

  const [pin, setPin] = useState<{
    initial: RoutePoint | null;
    label: string;
  } | null>(null);

  const busy = useRef(false);
  const alive = useRef(true);

  const request =
    useRef<AbortController | null>(null);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);

  const local = useMemo(() => {
    const keyword = normalizeSearch(query);

    if (keyword.length < 2) return [];

    return places
      .filter(
        place =>
          place.coordinates_valid &&
          validRoutePoint(place) &&
          normalizeSearch(
            `${place.name} ${place.address ?? ''}`,
          ).includes(keyword),
      )
      .slice(0, 4);
}, [query, places]);

  function apply(
    point: RoutePoint,
    label: string,
  ) {
    onChange(current => ({
      ...current,
      startLabel: label,
      latitude: point.latitude,
      longitude: point.longitude,
    }));

    setResults([]);
    setQuery('');
    setSearched('');
    setError('');
    setPin(null);
  }

  function openPin(
    initial?: RoutePoint,
    label?: string,
  ) {
    const selected =
      value.latitude !== null &&
      value.longitude !== null
        ? {
            latitude: value.latitude,
            longitude: value.longitude,
          }
        : null;

    setPin({
      initial: initial ?? selected,
      label:
        label ||
        query.trim() ||
        'Điểm xuất phát đã chọn trên bản đồ',
    });
  }

  async function run(
    kind: 'gps' | 'search',
  ) {
    if (disabled || busy.current) return;

    busy.current = true;
    setLoading(kind);
    onBusyChange(true);
    setError('');

    try {
      if (kind === 'gps') {
        const controller = new AbortController();
        request.current = controller;

        const location =
          await getTripLocation(controller.signal);

        if (!alive.current) return;

        apply(
          location.coords,
          'Vị trí hiện tại của bạn',
        );

        if (
          (location.coords.accuracy ?? Infinity) > 50
        ) {
          setError(
            'Vị trí ước lượng ±' +
            `${Math.round(location.coords.accuracy!)} m. ` +
            'Có thể chỉnh lại bằng ghim.',
          );
        }
      } else {
        const found =
          await searchAddresses(query);

        if (!alive.current) return;

        setResults(found);
        setSearched(query.trim());

        if (!found.length) {
          setError(
            'Chưa tìm thấy địa chỉ. Bạn có thể chọn vị trí bằng ghim trên bản đồ.',
          );
        }
      }
    } catch (error) {
      if (alive.current) {
        setError(
          error instanceof Error
            ? error.message
            : 'Không lấy được vị trí.',
        );
      }
    } finally {
      request.current = null;
      busy.current = false;

      if (alive.current) {
        setLoading(null);
        onBusyChange(false);
      }
    }
  }

  function choose(result: AddressResult) {
    const save = () =>
      apply(
        result,
        [
          result.title,
          result.subtitle,
        ].filter(Boolean).join(', '),
      );

    const number =
      requestedHouseNumber(searched);

    if (
      number &&
      number.toLowerCase() !==
        result.houseNumber?.toLowerCase()
    ) {
      Alert.alert(
        'Chưa tìm đúng số nhà',
        'Nguồn tìm kiếm mới xác định được đường hoặc khu vực. Bạn có thể đặt ghim đúng vị trí.',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Dùng vị trí kết quả',
            onPress: save,
          },
          {
            text: 'Đặt ghim',
            onPress: () =>
              openPin(result, searched),
          },
        ],
      );
    } else {
      save();
    }
  }

  const disabledInput =
    disabled || loading !== null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>ĐIỂM XUẤT PHÁT</Text>
      <Text style={s.title}>{value.startLabel}</Text>

      <Text style={s.muted}>
        {value.latitude !== null &&
        value.longitude !== null
          ? 'Đã chọn vị trí xuất phát'
          : 'Chọn địa chỉ, ghim bản đồ hoặc GPS'}
      </Text>

      <View
        style={[
          s.row,
          { flexWrap: 'wrap' },
        ]}
      >
        <Action
          label={
            loading === 'gps'
              ? 'Đang lấy vị trí…'
              : '◎ GPS hiện tại'
          }
          disabled={disabledInput}
          onPress={() => void run('gps')}
        />

        <Action
          label="⌖ Chọn trên bản đồ"
          disabled={disabledInput}
          onPress={() => openPin()}
        />
      </View>

      <TextInput
        style={s.input}
        value={query}
        placeholder="Tên khách sạn, quán ăn hoặc địa chỉ…"
        placeholderTextColor={C.muted}
        accessibilityLabel="Tìm điểm xuất phát"
        editable={!disabledInput}
        onChangeText={text => {
          setQuery(text);
          setResults([]);
          setSearched('');
          setError('');
        }}
      />

      <Action
        label={
          loading === 'search'
            ? 'Đang tìm…'
            : '⌕ Tìm địa chỉ'
        }
        disabled={
          disabledInput ||
          query.trim().length < 3
        }
        onPress={() => void run('search')}
      />

      {local.map(place => (
        <Pressable
          key={place.id}
          accessibilityRole="button"
          disabled={disabledInput}
          style={[s.card, { padding: 10 }]}
          onPress={() =>
            apply(place, place.name)
          }
        >
          <Text style={s.title}>
            {requestedHouseNumber(query)
              ? place.address ?? place.name
              : place.name}
          </Text>

          {!requestedHouseNumber(query) &&
            !!place.address && (
              <Text style={s.muted}>
                {place.address}
              </Text>
            )}
        </Pressable>
      ))}

      {results.map(result => {
        const addressOnly =
          result.isAddress ||
          !!requestedHouseNumber(searched);

        return (
          <Pressable
            key={result.id}
            accessibilityRole="button"
            disabled={disabledInput}
            style={[s.card, { padding: 10 }]}
            onPress={() => choose(result)}
          >
            <Text style={s.title}>
              {addressOnly
                ? result.subtitle || result.title
                : result.title}
            </Text>

            {!addressOnly &&
              !!result.subtitle && (
                <Text style={s.muted}>
                  {result.subtitle}
                </Text>
              )}
          </Pressable>
        );
      })}

      {!!error && (
        <Text
          accessibilityRole="alert"
          style={s.error}
        >
          {error}
        </Text>
      )}

      <Text style={s.muted}>
        © OpenStreetMap contributors · Nominatim
      </Text>

      {pin && (
        <TripOriginPin
          initial={pin.initial}
          label={pin.label}
          onClose={() => setPin(null)}
          onConfirm={point =>
            apply(point, pin.label)
          }
        />
      )}
    </View>
  );
}