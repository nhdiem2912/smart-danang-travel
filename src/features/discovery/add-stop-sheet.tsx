import Ionicons from '@expo/vector-icons/Ionicons';
import {
  router,
} from 'expo-router';

import {
  useEffect,
  useState,
} from 'react';

import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  Place,
} from '@/data/place.types';

import {
  dateForDay,
  displayDate,
  PERIODS,
  type DraftStop,
  type Period,
  type TripDraft,
} from './trip-model';

import {
  hasActiveTrip,
  placeSlotError,
} from './trip-time-policy';

import {
  Action,
  C,
  s,
  Sheet,
} from './ui';

import {
  tripActions,
  useTripDraft,
} from './use-trip-draft';

export function AddStopSheet({
  place,
  editing,
  close,
  onSaved,
  onDuplicate,
}: {
  place: Place;
  editing?: DraftStop;
  close: () => void;
  onSaved: () => void;
  onDuplicate?: () => void;
}) {
  const {
    draft,
    saving,
  } = useTripDraft();
const slotError = (
  trip: TripDraft,
  dayIndex: number,
  selected: Period,
  at: number,
) =>
  placeSlotError(
    trip,
    dayIndex,
    selected,
    place.opening_hours_raw,
    at,
  );
  const [now, setNow] = useState(
    () => Date.now(),
  );

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now()),
      30000,
    );

    return () => {
      clearInterval(timer);
    };
  }, []);

  const [day, setDay] = useState(
    () => {
      if (editing) {
        return editing.dayIndex;
      }

      if (!draft) {
        return 0;
      }

      return (
        Array.from(
          {
            length: draft.dayCount,
          },
          (_, index) => index,
        ).find(index => {
          const alreadyAdded =
            draft.stops.some(
              stop =>
                stop.placeId ===
                  place.id &&
                stop.dayIndex ===
                  index,
            );

          const available =
            PERIODS.some(
              period =>
                !slotError(
                  draft,
                  index,
                  period.id,
                  now,
                ),
            );

          return (
            !alreadyAdded &&
            available
          );
        }) ?? 0
      );
    },
  );

  const [period, setPeriod] =
    useState<Period>(() => {
      if (editing) {
        return editing.period;
      }

      if (!draft) {
        return 'morning';
      }

      return (
        PERIODS.find(
          item =>
            !slotError(
              draft,
              day,
              item.id,
              now,
            ),
        )?.id ?? 'morning'
      );
    });

  const [note, setNote] = useState(
    editing?.note ?? '',
  );

  const [orderLocked, setOrderLocked] =
    useState(
      editing?.orderLocked ?? false,
    );

  const [minutes, setMinutes] =
    useState(
      editing?.visitMinutes
        ?.toString() ?? '',
    );

  const [showDays, setShowDays] =
    useState(false);

  const [error, setError] =
    useState('');

  if (!draft) {
    return null;
  }

  if (!hasActiveTrip(draft)) {
    return (
      <Sheet
        title="Chưa có chuyến đi"
        visible
        close={close}
      >
        <Text style={s.muted}>
          Chọn ngày cho chuyến mới
          trước khi thêm địa điểm.
        </Text>

        <Action
          solid
          label="Tạo chuyến tại màn Lộ trình"
          onPress={() => {
            close();
            router.navigate(
              '/itinerary',
            );
          }}
        />
      </Sheet>
    );
  }

  const timeError = slotError(
    draft,
    day,
    period,
    now,
  );

  async function submit() {
    try {
      setError('');

      if (
        minutes.trim() &&
        (
          !/^\d+$/.test(
            minutes.trim(),
          ) ||
          Number(minutes) < 1 ||
          Number(minutes) > 720
        )
      ) {
        throw new Error(
          'Thời gian dừng phải là số phút ' +
          'nguyên từ 1 đến 720.',
        );
      }

      await tripActions.add({
        id: editing?.id,
        placeId: place.id,
        dayIndex: day,
        period,
        note: note.trim(),
        visitMinutes:
          minutes.trim()
            ? Number(minutes)
            : null,
        orderLocked,
      });

      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : (
              'Không lưu được địa điểm. ' +
              'Hãy thử lại.'
            ),
      );
    }
  }

  async function remove() {
    if (!editing) {
      return;
    }

    try {
      setError('');

      await tripActions.remove(
        editing.id,
      );

      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không xóa được địa điểm.',
      );
    }
  }

  return (
    <Sheet
      title={
        editing
          ? 'Sửa địa điểm trong lộ trình'
          : 'Thêm địa điểm vào lộ trình'
      }
      subtitle="Chọn ngày và khung giờ mong muốn"
      visible
      close={() => {
        if (!saving) {
          close();
        }
      }}
      footer={
        <View
          style={{
            gap: 8,
          }}
        >
          {editing && (
            <Action
              danger
              label="Xóa địa điểm khỏi ngày này"
              disabled={saving}
              onPress={() =>
                void remove()
              }
            />
          )}

          <View style={s.row}>
            <Action
              label="Hủy"
              onPress={close}
              disabled={saving}
            />

            <Action
              label={
                saving
                  ? 'Đang lưu…'
                  : editing
                    ? '✓ Lưu thay đổi'
                    : '✓ Thêm vào lộ trình'
              }
              onPress={() =>
                void submit()
              }
              solid
              disabled={
                saving ||
                !!timeError ||
                !!editing?.completed
              }
              style={{
                flex: 1,
              }}
            />
          </View>
        </View>
      }
    >
      <View
        style={[
          s.card,
          {
            flexDirection: 'row',
            alignItems: 'center',
          },
        ]}
      >
        <Text
          style={{
            fontSize: 20,
          }}
        >
          📍
        </Text>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text style={s.title}>
            {place.name}
          </Text>

          <Text style={s.muted}>
            {place.address ??
              'Chưa cập nhật địa chỉ'}
          </Text>
        </View>
      </View>

      {editing && onDuplicate && (
        <Action
          label="＋ Thêm điểm này ở ngày khác"
          onPress={onDuplicate}
          disabled={
            saving ||
            draft.stops.filter(
              stop =>
                stop.placeId ===
                place.id,
            ).length >=
              draft.dayCount
          }
        />
      )}

      <Text style={s.label}>
        THÊM VÀO NGÀY
      </Text>

           <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chọn ngày đi"
        accessibilityState={{
          expanded: showDays,
          disabled: saving,
        }}
        disabled={saving}
        onPress={() =>
          setShowDays(value => !value)
        }
        style={[
          s.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: 50,
            paddingVertical: 8,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={C.green}
        />

        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: '600',
            color: C.ink,
          }}
        >
          Ngày {day + 1} ·{' '}
          {displayDate(
            dateForDay(draft.startDate, day),
          )}
        </Text>

        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: '#E8F5EF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={
              showDays
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={18}
            color={C.green}
          />
        </View>
      </Pressable>

      {showDays && (
        <View
          style={{
            gap: 6,
          }}
        >
          {Array.from(
            {
              length:
                draft.dayCount,
            },
            (_, index) => {
              const disabled =
                PERIODS.every(
                  item =>
                    !!slotError(
                      draft,
                      index,
                      item.id,
                      now,
                    ),
                );

              return (
                <Action
                  key={index}
                  label={
                    `Ngày ${index + 1}: ` +
                    displayDate(
                      dateForDay(
                        draft.startDate,
                        index,
                      ),
                    )
                  }
                  disabled={disabled}
                  solid={
                    day === index
                  }
                  onPress={() => {
                    setDay(index);

                    const next =
                      PERIODS.find(
                        item =>
                          !slotError(
                            draft,
                            index,
                            item.id,
                            now,
                          ),
                      );

                    if (next) {
                      setPeriod(
                        next.id,
                      );
                    }

                    setShowDays(
                      false,
                    );
                  }}
                />
              );
            },
          )}
        </View>
      )}

      {!!timeError && (
        <Text
          accessibilityRole="alert"
          style={s.error}
        >
          {timeError}
        </Text>
      )}

      <Text style={s.label}>
        KHUNG GIỜ TRONG NGÀY
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {PERIODS.map(item => {
          const disabled =
            !!slotError(
              draft,
              day,
              item.id,
              now,
            );

          const selected =
            period === item.id;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={
                item.label
              }
              accessibilityState={{
  selected,
  disabled: saving,
}}
disabled={saving}
onPress={() => {
  const reason = slotError(
    draft,
    day,
    item.id,
    Date.now(),
  );

  setError(reason ?? '');

  if (!reason) {
    setPeriod(item.id);
  }
}}
              style={[
                s.pill,
                {
                  width: '48%',
                  opacity:
                    disabled
                      ? 0.35
                      : 1,
                },
                selected &&
                  s.pillActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color:
                    selected
                      ? C.deep
                      : C.ink,
                }}
              >
                {item.icon}{' '}
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Action
        label={
          editing?.completed
            ? 'Đã hoàn thành · giữ thứ tự'
            : orderLocked
              ? '🔒 Giữ thứ tự · nhấn để mở khóa'
              : 'Cho phép tối ưu thứ tự · nhấn để khóa'
        }
        disabled={
          saving ||
          editing?.completed
        }
        onPress={() =>
          setOrderLocked(
            value => !value,
          )
        }
      />

      <Text style={s.label}>
        GHI CHÚ THÊM
      </Text>

      <TextInput
        accessibilityLabel="Ghi chú địa điểm"
        multiline
        maxLength={1000}
        value={note}
        onChangeText={setNote}
        placeholder={
          'VD: Chụp ảnh check-in, ' +
          'ăn hải sản...'
        }
        placeholderTextColor={
          C.muted
        }
        style={[
          s.input,
          {
            minHeight: 62,
            textAlignVertical: 'top',
          },
        ]}
      />

      <Text style={s.label}>
        THỜI GIAN DỪNG DỰ KIẾN
        {' '}
        (PHÚT, TÙY CHỌN)
      </Text>

      <TextInput
        accessibilityLabel="Thời gian dừng dự kiến"
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
        placeholder={
          'Để trống: dùng thời gian ' +
          'tham quan của địa điểm hoặc ' +
          'mặc định chuyến đi'
        }
        placeholderTextColor={
          C.muted
        }
        style={s.input}
      />

      <Text style={s.muted}>
        Một địa điểm chỉ xuất hiện một lần
        trong mỗi ngày. Có thể chọn lại ở
        ngày khác.
      </Text>

      {!!error && (
        <Text
          accessibilityRole="alert"
          style={s.error}
        >
          {error}
        </Text>
      )}
    </Sheet>
  );
}