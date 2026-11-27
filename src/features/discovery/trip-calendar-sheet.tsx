import {
    useState,
} from 'react';

import {
    Alert,
    Pressable,
    Text,
    View,
} from 'react-native';

import { displayDate } from './trip-model';
import { Action, Sheet, useDiscoveryUI } from './ui';

import {
    tripActions,
    useTripDraft,
} from './use-trip-draft';

import {
    hasActiveTrip,
    vietnamClock,
} from './trip-time-policy';

const DAY = 86400000;

function utc(date: string) {
  return Date.parse(
    date + 'T00:00:00Z',
  );
}

function iso(ms: number) {
  return new Date(ms)
    .toISOString()
    .slice(0, 10);
}

export function TripCalendarSheet({
  close,
  onSaved,
}: {
  close: () => void;
  onSaved: () => void;
}) {
  const { C, s } = useDiscoveryUI();

  const {
    draft,
    saving,
  } = useTripDraft();

  const [today] = useState(
    () => vietnamClock().date,
  );

  const [month, setMonth] =
    useState(
      () =>
        today.slice(0, 7) +
        '-01',
    );

  const [start, setStart] =
    useState('');

  const [end, setEnd] =
    useState('');

  const [error, setError] =
    useState('');

  const first = new Date(
    utc(month),
  );

  const offset =
    (first.getUTCDay() + 6) % 7;

  const days = new Date(
    Date.UTC(
      first.getUTCFullYear(),
      first.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  const count =
    start && end
      ? Math.round(
          (
            utc(end) -
            utc(start)
          ) / DAY,
        ) + 1
      : 0;

  function choose(value: string) {
    setError('');

    if (
      !start ||
      end ||
      value < start
    ) {
      setStart(value);
      setEnd('');
    } else {
      setEnd(value);
    }
  }

  async function apply() {
    try {
      setError('');

      await tripActions.resetDates(
        start,
        count,
      );

      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Chưa đổi được ngày.',
      );
    }
  }

  function confirm() {
    if (
      !start ||
      !end ||
      count < 1 ||
      count > 14
    ) {
      setError(
        'Chọn ngày bắt đầu và kết thúc, ' +
        'từ 1 đến 14 ngày.',
      );

      return;
    }

    if (
      draft &&
      hasActiveTrip(draft)
    ) {
      Alert.alert(
        'Đổi ngày và bắt đầu lại?',
        'Sẽ xóa toàn bộ địa điểm đã chọn, ' +
        'tiến trình, chặng đang dở, kết quả ' +
        'di chuyển, giờ xếp và đánh giá của ' +
        'chuyến hiện tại. Lịch sử chuyến cũ ' +
        'vẫn giữ nguyên.',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Reset và đổi ngày',
            style: 'destructive',
            onPress: () => {
              void apply();
            },
          },
        ],
      );
    } else {
      void apply();
    }
  }

  function changeMonth(
    direction: -1 | 1,
  ) {
    setMonth(
      iso(
        Date.UTC(
          first.getUTCFullYear(),
          first.getUTCMonth() +
            direction,
          1,
        ),
      ),
    );
  }

  return (
    <Sheet
      title="Chọn ngày chuyến đi"
      subtitle={
        'Giờ Việt Nam · Chọn ngày bắt đầu, ' +
        'rồi ngày kết thúc'
      }
      visible
      close={() => {
        if (!saving) {
          close();
        }
      }}
      footer={
        <Action
          solid
          label={
            saving
              ? 'Đang lưu…'
              : 'Xác nhận ngày đi'
          }
          disabled={
            saving ||
            count < 1 ||
            count > 14
          }
          onPress={confirm}
        />
      }
    >
      <View style={s.between}>
        <Action
          label="‹"
          onPress={() =>
            changeMonth(-1)
          }
        />

        <Text style={s.title}>
          Tháng{' '}
          {first.getUTCMonth() + 1}
          /
          {first.getUTCFullYear()}
        </Text>

        <Action
          label="›"
          onPress={() =>
            changeMonth(1)
          }
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
        }}
      >
        {[
          'T2',
          'T3',
          'T4',
          'T5',
          'T6',
          'T7',
          'CN',
        ].map(label => (
          <Text
            key={label}
            style={{
              width: '14.285%',
              textAlign: 'center',
              color: C.muted,
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {Array.from(
          {
            length:
              offset + days,
          },
          (_, index) => {
            if (index < offset) {
              return (
                <View
                  key={index}
                  style={{
                    width: '14.285%',
                    height: 43,
                  }}
                />
              );
            }

            const date = iso(
              utc(month) +
              (
                index - offset
              ) * DAY,
            );

            const disabled =
              date < today;

            const active =
              date === start ||
              date === end ||
              !!(
                end &&
                date > start &&
                date < end
              );

            return (
              <Pressable
                key={index}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={displayDate(date)}
                accessibilityState={{
                  selected: active,
                  disabled,
                }}
                onPress={() =>
                  choose(date)
                }
                style={{
                  width: '14.285%',
                  height: 43,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor:
                    active
                      ? C.deep
                      : 'transparent',
                  opacity:
                    disabled
                      ? 0.25
                      : 1,
                }}
              >
                <Text
                  style={{
                    color:
                      active
                        ? C.onAccent
                        : C.ink,
                  }}
                >
                  {index - offset + 1}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>

      <Text style={s.title}>
        {start ? displayDate(start) : 'Ngày bắt đầu'}
        {' → '}
        {end ? displayDate(end) : 'Ngày kết thúc'}
      </Text>

      <Text style={s.muted}>
        {count
          ? (
              `${count} ngày · ` +
              `${Math.max(0, count - 1)} đêm`
            )
          : (
              'Muốn đi một ngày: ' +
              'chọn cùng một ngày hai lần.'
            )}
      </Text>

      {count > 14 && (
        <Text style={s.error}>
          Hỗ trợ tối đa 14 ngày.
          Chọn lại khoảng ngắn hơn.
        </Text>
      )}

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}