import {
    useEffect,
    useState,
} from 'react';

import {
    Alert,
    Text,
    View,
} from 'react-native';

import {
    useAccount,
} from '@/features/account/account-store';

import {
    dateForDay,
    displayDate,
    sortedStops,
} from './trip-model';

import {
    hasLegacyTrip,
    importLegacyTrip,
} from './trip-lifecycle';

import {
    listTripHistory,
    type TripArchive,
} from './trip-history-api';

import {
    Action,
    s,
    Sheet,
} from './ui';

export function TripHistoryCard() {
  const { user } = useAccount();

  const [open, setOpen] =
    useState(false);

  const [legacy, setLegacy] =
    useState(false);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    let alive = true;

    void hasLegacyTrip()
      .then(value => {
        if (alive) {
          setLegacy(value);
        }
      })
      .catch(() => {
        if (alive) {
          setMessage(
            'Chưa đọc được bản nháp cũ trên thiết bị.',
          );
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  function confirmImport() {
    Alert.alert(
      'Chuyển chuyến cũ?',
      'Chỉ chuyển nếu tài khoản hiện chưa có chuyến. ' +
      'Bản gốc trên thiết bị vẫn được giữ.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Chuyển chuyến',
          onPress: () => {
            void importLegacyTrip()
              .then(() => {
                setMessage(
                  'Đã chuyển bản nháp vào tài khoản này.',
                );

                setLegacy(false);
              })
              .catch(error => {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : 'Không chuyển được.',
                );
              });
          },
        },
      ],
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>
        Lịch sử chuyến đi
      </Text>

      <Text style={s.muted}>
        Lưu riêng trên tài khoản Google.
        Đăng nhập trên thiết bị khác để xem lại.
      </Text>

      <Action
        solid
        label="Xem lịch sử chuyến đi"
        disabled={!user}
        onPress={() => setOpen(true)}
      />

      {legacy && (
        <Action
          label="Chuyển bản nháp cũ trên máy vào tài khoản"
          onPress={confirmImport}
        />
      )}

      {!!message && (
        <Text style={s.muted}>
          {message}
        </Text>
      )}

      {open && user && (
        <HistorySheet
          key={user.uid}
          uid={user.uid}
          close={() => setOpen(false)}
        />
      )}
    </View>
  );
}

function HistorySheet({
  uid,
  close,
}: {
  uid: string;
  close: () => void;
}) {
  const [trips, setTrips] =
    useState<TripArchive[]>([]);

  const [token, setToken] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState(true);

  const [error, setError] =
    useState('');

  const [attempt, setAttempt] =
    useState(0);

  const [details, setDetails] =
    useState<TripArchive | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    void listTripHistory(
      uid,
      undefined,
      controller.signal,
    )
      .then(result => {
        if (controller.signal.aborted) {
          return;
        }

        setTrips(result.trips);
        setToken(result.nextPageToken);
      })
      .catch(caught => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : 'Không tải được lịch sử.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBusy(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [uid, attempt]);

  async function more() {
    if (!token || busy) return;

    setBusy(true);
    setError('');

    try {
      const result =
        await listTripHistory(
          uid,
          token,
        );

      setTrips(previous => [
        ...previous,
        ...result.trips.filter(
          trip =>
            !previous.some(
              existing =>
                existing.trip.id ===
                trip.trip.id,
            ),
        ),
      ]);

      setToken(
        result.nextPageToken,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được trang tiếp theo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Lịch sử chuyến đi"
      subtitle="Dữ liệu trên tài khoản · chỉ xem"
      visible
      close={close}
    >
      <Action
        label={
          busy
            ? 'Đang tải…'
            : 'Tải lại'
        }
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setError('');
          setAttempt(value => value + 1);
        }}
      />

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}

      {!busy &&
        !error &&
        !trips.length && (
          <Text style={s.muted}>
            Chưa có chuyến đi đã hoàn tất.
          </Text>
        )}

      {trips.map(item => (
        <View
          key={item.trip.id}
          style={s.card}
        >
          <Text style={s.title}>
            {displayDate(
              item.trip.startDate,
            )}
            {' — '}
            {displayDate(
              dateForDay(
                item.trip.startDate,
                item.trip.dayCount - 1,
              ),
            )}
          </Text>

          <Text style={s.muted}>
            {item.trip.dayCount} ngày
            {' · '}
            {item.trip.stops.length} địa điểm
            {' · '}
            {item.trip.review?.rating} ★
          </Text>

          <Action
            label="Xem chi tiết"
            onPress={() =>
              setDetails(item)
            }
          />
        </View>
      ))}

      {token && (
        <Action
          label="Xem thêm"
          disabled={busy}
          onPress={() => void more()}
        />
      )}

      {details && (
        <Sheet
          title="Chi tiết chuyến đã hoàn tất"
          visible
          close={() =>
            setDetails(null)
          }
        >
          <Text style={s.title}>
            {displayDate(
              details.trip.startDate,
            )}
            {' · '}
            {details.trip.dayCount} ngày
          </Text>

          <Text style={s.muted}>
            Đánh giá:
            {' '}
            {details.trip.review?.rating} ★
            {' · '}
            {details.trip.review?.note ||
              'Không có ghi chú'}
          </Text>

          {sortedStops(
            details.trip.stops,
          ).map(stop => {
            const place =
              details.places.find(
                item =>
                  item.id === stop.placeId,
              );

            const result = stop.result;

            const resultText = result
              ? (
                  'Di chuyển: ' +
                  Math.round(
                    result.activeSeconds / 60,
                  ) +
                  ' phút · GPS: ' +
                  (
                    result.gpsMeters === null
                      ? 'Chưa đủ dữ liệu'
                      : (
                          result.gpsMeters /
                          1000
                        ).toFixed(2) + ' km'
                  ) +
                  (
                    result.gpsPartial
                      ? ' (một phần)'
                      : ''
                  )
                )
              : (
                  'Đã check-in · ' +
                  'Không có kết quả đo di chuyển'
                );

            return (
              <View
                style={s.card}
                key={stop.id}
              >
                <Text style={s.title}>
                  Ngày {stop.dayIndex + 1}
                  {' · '}
                  {place?.name ||
                    stop.placeId}
                </Text>

                <Text style={s.muted}>
                  {place?.address ||
                    'Chưa có địa chỉ'}
                </Text>

                <Text style={s.muted}>
                  {resultText}
                </Text>
              </View>
            );
          })}
        </Sheet>
      )}
    </Sheet>
  );
}