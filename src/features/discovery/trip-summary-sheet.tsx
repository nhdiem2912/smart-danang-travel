import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { findPlaceById } from '@/data/places.local';
import { useSettingsColors } from '@/features/settings/settings-colors';

import {
  dateForDay,
  displayDate,
  emptyDraft,
  minuteToTime,
  PERIODS,
  sortedStops,
  type DraftStop,
  type TripSettings,
} from './trip-model';

import { PlaceThumb } from './place-thumb';
import { TripOriginPicker } from './trip-origin-picker';
import { currentPlan } from './trip-plan';
import { pendingDayView } from './trip-summary-view';
import { vietnamClock } from './trip-time-policy';
import { Action, Sheet, useDiscoveryUI } from './ui';
import {
  tripActions,
  useTripDraft,
} from './use-trip-draft';

type Props = {
  close: () => void;
  onEdit?: (stop: DraftStop) => void;
};

export function TripSummarySheet({
  close,
  onEdit,
}: Props) {
  const { C, s } = useDiscoveryUI();
  const st = createSt(C);

  const { draft, saving } = useTripDraft();
  const c = useSettingsColors();

  const [chosenDay, setChosenDay] =
    useState<number | null>(null);

  const [daysOpen, setDaysOpen] = useState(false);
  const [configuration, setConfiguration] =
    useState(false);

  const [settings, setSettings] =
    useState<TripSettings>(() => ({
      ...(draft?.settings ?? emptyDraft().settings),
    }));

  const [minutes, setMinutes] = useState(
    String(draft?.settings.defaultVisitMinutes ?? 60),
  );

  const [optimizing, setOptimizing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!draft) return null;

  const view = pendingDayView(
    draft,
    chosenDay,
    vietnamClock().date,
  );

  const activeLeg = draft.stops.some(
    stop => stop.progress,
  );

  const busy = saving || optimizing || locating;
  const locked = busy || activeLeg;

  const changed =
    JSON.stringify(settings) !==
      JSON.stringify(draft.settings) ||
    Number(minutes) !==
      draft.settings.defaultVisitMinutes;

  async function save(
    optimize: boolean,
    navigate = false,
  ) {
    if (busy || !draft) return;

    if (activeLeg) {
      if (navigate) {
        close();
        router.navigate('/itinerary');
      }
      return;
    }

    setOptimizing(true);
    setError('');
    setNotice('');

    try {
      if (!/^\d+$/.test(minutes)) {
        throw new Error(
          'Nhập thời gian dừng bằng số phút nguyên.',
        );
      }

      const next = {
        ...settings,
        defaultVisitMinutes: Number(minutes),
      };

      await tripActions.configure(
        draft.startDate,
        draft.dayCount,
        next,
        optimize,
      );

      setSettings(next);

      if (navigate) {
        close();
        router.navigate('/itinerary');
      } else {
        setConfiguration(false);
        setNotice('Đã lưu cấu hình.');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được thay đổi.',
      );
    } finally {
      setOptimizing(false);
    }
  }

  async function act(
    operation: () => Promise<unknown>,
  ) {
    if (locked) return;

    try {
      setError('');
      await operation();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được thay đổi.',
      );
    }
  }

  function removeDay() {
    if (
      !draft ||
      locked ||
      !view.stops.length
    ) {
      return;
    }

    const day = view.dayIndex;
    const tripId = draft.id;

    Alert.alert(
      `Bỏ điểm chưa đi của Ngày ${day + 1}?`,
      `${view.stops.length} điểm sẽ được bỏ khỏi ngày này. Các điểm đã hoàn thành được giữ lại.`,
      [
        {
          text: 'Giữ lại',
          style: 'cancel',
        },
        {
          text: 'Bỏ các điểm',
          style: 'destructive',
          onPress: () =>
            void act(() =>
              tripActions.removePendingDay(
                day,
                tripId,
              ),
            ),
        },
      ],
    );
  }

  return (
    <Sheet
      title="Điểm chưa đi"
      visible
      close={() => {
        if (!busy) close();
      }}
      footer={
        <View style={st.footer}>
          <Action
            danger
            label="Bỏ điểm ngày này"
            disabled={
              locked || !view.stops.length
            }
            onPress={removeDay}
            style={{ flex: 1 }}
          />

          <Action
            solid
            label={
              optimizing
                ? 'Đang xếp…'
                : activeLeg
                  ? 'Tiếp tục lộ trình'
                  : view.total
                    ? 'Xếp giờ & xem'
                    : 'Xem lộ trình'
            }
            disabled={busy}
            style={{ flex: 1 }}
            onPress={() => {
              if (activeLeg || !view.total) {
                close();
                router.navigate('/itinerary');
              } else {
                void save(
                  !currentPlan(draft) || changed,
                  true,
                );
              }
            }}
          />
        </View>
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chọn ngày xem địa điểm"
        accessibilityState={{
          expanded: daysOpen,
        }}
        onPress={() =>
          setDaysOpen(value => !value)
        }
        style={[
          st.daySelect,
          {
            borderColor: c.line,
            backgroundColor: c.input,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={c.green}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.text,
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            Ngày {view.dayIndex + 1} ·{' '}
            {displayDate(
              dateForDay(
                draft.startDate,
                view.dayIndex,
              ),
            )}
          </Text>

          <Text
            style={{
              color: c.muted,
              fontSize: 12,
              marginTop: 3,
            }}
          >
            {view.stops.length} điểm chưa đi
          </Text>
        </View>

        <Ionicons
          name={
            daysOpen
              ? 'chevron-up'
              : 'chevron-down'
          }
          size={18}
          color={c.green}
        />
      </Pressable>

      {daysOpen && (
        <ScrollView
          nestedScrollEnabled
          style={{ maxHeight: 190 }}
          keyboardShouldPersistTaps="handled"
        >
          {view.days.map(day => (
            <Pressable
              key={day.index}
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  day.index === view.dayIndex,
              }}
              onPress={() => {
                setChosenDay(day.index);
                setDaysOpen(false);
                setError('');
              }}
              style={[
                st.dayOption,
                {
                  backgroundColor:
                    day.index === view.dayIndex
                      ? c.pale
                      : c.card,
                },
              ]}
            >
              <Text
                style={{
                  flex: 1,
                  color: c.text,
                  fontSize: 13,
                }}
              >
                Ngày {day.index + 1} ·{' '}
                {displayDate(day.date)}
              </Text>

              <Text
                style={{
                  color: c.muted,
                  fontSize: 12,
                }}
              >
                {day.count
                  ? `${day.count} điểm`
                  : 'Không còn điểm chưa đi'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          expanded: configuration,
        }}
        onPress={() =>
          setConfiguration(value => !value)
        }
        style={st.configToggle}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={c.green}
        />

        <Text
          style={{
            flex: 1,
            color: c.text,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          Cấu hình chuyến
        </Text>

        <Ionicons
          name={
            configuration
              ? 'chevron-up'
              : 'chevron-down'
          }
          size={16}
          color={c.muted}
        />
      </Pressable>

      {configuration && (
        <View
          style={[
            st.configuration,
            {
              backgroundColor: c.input,
              borderColor: c.line,
            },
          ]}
        >
          <TripOriginPicker
            value={settings}
            disabled={locked}
            onChange={setSettings}
            onBusyChange={setLocating}
          />

          <View style={st.footer}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={st.label}>
                Bắt đầu
              </Text>

              <TextInput
                accessibilityLabel="Giờ bắt đầu"
                editable={!locked}
                style={s.input}
                value={settings.startTime}
                onChangeText={value =>
                  setSettings(old => ({
                    ...old,
                    startTime: value,
                  }))
                }
              />
            </View>

            <View style={{ flex: 1, gap: 5 }}>
              <Text style={st.label}>
                Kết thúc
              </Text>

              <TextInput
                accessibilityLabel="Giờ kết thúc"
                editable={!locked}
                style={s.input}
                value={settings.endTime}
                onChangeText={value =>
                  setSettings(old => ({
                    ...old,
                    endTime: value,
                  }))
                }
              />
            </View>
          </View>

          <View style={st.footer}>
            {(
              [
                ['driving', 'Ô tô'],
                ['walking', 'Đi bộ'],
              ] as const
            ).map(([id, label]) => (
              <Action
                key={id}
                label={label}
                solid={
                  settings.travelMode === id
                }
                disabled={locked}
                onPress={() =>
                  setSettings(old => ({
                    ...old,
                    travelMode: id,
                  }))
                }
              />
            ))}
          </View>

          <Text style={st.label}>
            Thời gian dừng mặc định · phút
          </Text>

          <TextInput
            accessibilityLabel="Thời gian dừng mặc định"
            keyboardType="number-pad"
            editable={!locked}
            value={minutes}
            onChangeText={setMinutes}
            style={s.input}
          />

          <Action
            label="Lưu cấu hình"
            disabled={locked}
            onPress={() => void save(false)}
          />
        </View>
      )}

      {activeLeg && (
        <Text
          style={{
            color: c.muted,
            fontSize: 12,
          }}
        >
          Đang di chuyển. Bạn có thể chỉnh danh
          sách sau khi kết thúc chặng.
        </Text>
      )}

      {!!error && (
        <Text
          accessibilityRole="alert"
          style={s.error}
        >
          {error}
        </Text>
      )}

      {!!notice && (
        <Text
          style={{
            color: c.green,
            fontSize: 12,
          }}
        >
          {notice}
        </Text>
      )}

      {view.stops.map((stop, index) => {
        const place = findPlaceById(
          stop.placeId,
        );

        const group = sortedStops(
          draft.stops.filter(
            item =>
              item.dayIndex === stop.dayIndex &&
              item.period === stop.period,
          ),
        );

        const at = group.findIndex(
          item => item.id === stop.id,
        );

        const previous = group[at - 1];
        const next = group[at + 1];

        const visitMinutes =
          stop.visitMinutes ??
          place?.visit_duration_minutes ??
          draft.settings.defaultVisitMinutes;

        const upDisabled =
          locked ||
          !previous ||
          previous.completed ||
          !!previous.progress;

        const downDisabled =
          locked ||
          !next ||
          next.completed ||
          !!next.progress;

        return (
          <View
            key={stop.id}
            style={[
              st.stop,
              {
                backgroundColor: c.card,
                borderColor: c.line,
              },
            ]}
          >
            <Text
              style={{
                color: c.green,
                fontWeight: '800',
                fontSize: 12,
                width: 18,
              }}
            >
              {index + 1}
            </Text>

            {place && (
              <PlaceThumb
                place={place}
                size={46}
              />
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sửa ${place?.name ?? 'địa điểm'}`}
              disabled={locked || !onEdit}
              onPress={() => onEdit?.(stop)}
              style={{ flex: 1, gap: 4 }}
            >
              <Text
                numberOfLines={2}
                style={{
                  color: c.text,
                  fontSize: 14,
                  lineHeight: 19,
                  fontWeight: '700',
                }}
              >
                {place?.name ??
                  'Địa điểm chưa có dữ liệu'}
              </Text>

              <Text
                numberOfLines={1}
                style={{
                  color: c.muted,
                  fontSize: 12,
                }}
              >
                {
                  PERIODS.find(
                    period =>
                      period.id === stop.period,
                  )?.label
                }
                {' · '}
                {stop.schedule
                  ? `Dự kiến ${minuteToTime(stop.schedule.visitStartMinute)}`
                  : `~${visitMinutes} phút`}
              </Text>
            </Pressable>

            <View style={{ gap: 2 }}>
              <Pressable
                hitSlop={3}
                accessibilityRole="button"
                accessibilityLabel="Đưa địa điểm lên"
                disabled={upDisabled}
                onPress={() =>
                  void act(() =>
                    tripActions.move(
                      stop.id,
                      -1,
                    ),
                  )
                }
                style={[
                  st.iconButton,
                  {
                    opacity: upDisabled
                      ? 0.25
                      : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-up"
                  size={19}
                  color={c.green}
                />
              </Pressable>

              <Pressable
                hitSlop={3}
                accessibilityRole="button"
                accessibilityLabel="Đưa địa điểm xuống"
                disabled={downDisabled}
                onPress={() =>
                  void act(() =>
                    tripActions.move(
                      stop.id,
                      1,
                    ),
                  )
                }
                style={[
                  st.iconButton,
                  {
                    opacity: downDisabled
                      ? 0.25
                      : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-down"
                  size={19}
                  color={c.green}
                />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Bỏ ${place?.name ?? 'địa điểm'}`}
              disabled={locked}
              onPress={() =>
                void act(() =>
                  tripActions.remove(stop.id),
                )
              }
              style={[
                st.iconButton,
                { opacity: locked ? 0.3 : 1 },
              ]}
            >
              <Ionicons
                name="close"
                size={18}
                color={c.danger}
              />
            </Pressable>
          </View>
        );
      })}

      {!view.stops.length && (
        <View
          style={{
            paddingVertical: 24,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={34}
            color={c.green}
          />

          <Text
            style={{
              color: c.text,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            Ngày này không còn điểm chưa đi.
          </Text>

          <Text
            style={{
              color: c.muted,
              fontSize: 12,
            }}
          >
            Chọn ngày khác để xem tiếp.
          </Text>
        </View>
      )}
    </Sheet>
  );
}

const createSt = (C: ReturnType<typeof useDiscoveryUI>['C']) => StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  daySelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  dayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
  },
  configuration: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  label: {
    fontSize: 12,
    color: C.muted,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
  },
  iconButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});