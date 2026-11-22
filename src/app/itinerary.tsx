import {
  usePlacesCatalog,
} from '@/data/use-places-catalog';
import {
  TripCalendarSheet,
} from '@/features/discovery/trip-calendar-sheet';
import {
  TripSettingsSheet,
} from '@/features/discovery/trip-settings-sheet';
import { requestLegStart } from '@/features/discovery/trip-start-prompt';

import TripGuidance from '@/features/discovery/trip-guidance';
import { currentPlan } from '@/features/discovery/trip-plan';
import {
  cancelLeg,
} from '@/features/discovery/trip-session';
import {
  TripStopCard,
} from '@/features/discovery/trip-stop-card';
import {
  hasActiveTrip,
} from '@/features/discovery/trip-time-policy';
import { router, useFocusEffect, } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Place } from '@/data/place.types';
import { findPlaceById } from '@/data/places.local';

import { AddStopSheet } from '@/features/discovery/add-stop-sheet';
import SelectedPlacesMap from '@/features/discovery/selected-places-map';
import { TripSummarySheet } from '@/features/discovery/trip-summary-sheet';

import { formatTravelTime } from '@/features/discovery/trip-metrics';
import { TripResultsSheet } from '@/features/discovery/trip-results-sheet';

import {
  dateForDay,
  displayDate,
  PERIOD_WINDOWS,
  PERIODS,
  sortedStops,
  type DraftStop,
  type TravelMode,
} from '@/features/discovery/trip-model';

import {
  tripActions,
  tripStore,
  useTripDraft,
} from '@/features/discovery/use-trip-draft';

import {
  Action,
  C,
  Loading,
  s,
} from '@/features/discovery/ui';

export default function ItineraryScreen() {
  usePlacesCatalog();
    const startAlive = useRef(false);

  useFocusEffect(
    useCallback(() => {
      startAlive.current = true;

      return () => {
        startAlive.current = false;
      };
    }, []),
  );
  const insets = useSafeAreaInsets();
  const { draft, ready, saving, error } = useTripDraft();
  const [calendar, setCalendar] =
    useState(false);

  const [configuration, setConfiguration] =
    useState(false);
  const [day, setDay] = useState(0);
  const [summary, setSummary] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [editing, setEditing] =
    useState<DraftStop | undefined>();
  const [message, setMessage] = useState('');
  const [starting, setStarting] = useState(false);
  const report = useCallback(
    (value: string) => setMessage(value),
    [],
  );

  const activeDay = Math.min(
    day,
    (draft?.dayCount ?? 1) - 1,
  );

  const stops = useMemo(
    () =>
      sortedStops(
        draft?.stops.filter(
          stop => stop.dayIndex === activeDay,
        ) ?? [],
      ),
    [draft?.stops, activeDay],
  );

 const mapPlaces = stops
  .map(stop =>
    findPlaceById(stop.placeId),
  )
  .filter(
    (place): place is Place =>
      !!place &&
      place.coordinates_valid,
  );
const [session, setSession] = useState<{
  stops: DraftStop[];
  travelMode: TravelMode;
} | null>(null);

const closeGuidance = useCallback(
  () => setSession(null),
  [setSession],
);
  if (
    ready &&
    draft &&
    !hasActiveTrip(draft)
  ) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          paddingTop:
            insets.top + 24,
          gap: 18,
          justifyContent: 'center',
        }}
      >
        <Text style={s.title}>
          Chưa có chuyến đi
        </Text>

        <Text style={s.muted}>
          Tạo chuyến mới, chọn ngày rồi thêm
          địa điểm ở Khám phá. Chuyến đã hoàn
          tất nằm trong Cài đặt → Lịch sử
          chuyến đi.
        </Text>

        <Action
          solid
          label="Tạo chuyến đi mới"
          onPress={() =>
            setCalendar(true)
          }
        />

        {calendar && (
          <TripCalendarSheet
            close={() =>
              setCalendar(false)
            }
            onSaved={() => {
              setDay(0);
              setCalendar(false);
            }}
          />
        )}
      </View>
    );
  }  
if (!ready || !draft) {
    return (
      <Loading
        error={error}
        retry={() => void tripStore.load()}
      />
    );
  }
if (session) {
  return (
    <TripGuidance
      stops={session.stops}
      travelMode={session.travelMode}
      onClose={closeGuidance}
    />
  );
}
  async function act(operation: () => Promise<unknown>) {
    try {
      await operation();
      setMessage('');
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Không lưu được thay đổi.',
      );
    }
  }
    async function openLeg(id: string) {
    if (starting || saving) return;

    setStarting(true);

    try {
      const current =
        tripStore.getSnapshot().draft;

      const existing = current?.stops.find(
        stop => stop.id === id,
      );

      if (!current || !existing) {
        throw new Error(
          'Điểm này đã bị xóa.',
        );
      }

      const mode =
        existing.progress?.travelMode ??
        current.settings.travelMode;

      const next = await requestLegStart(
        id,
        mode,
        () => startAlive.current,
      );

      if (!next) {
        setMessage('');
        return;
      }

      const target = next.stops.find(
        stop => !!stop.progress,
      );

      if (!target) {
        throw new Error(
          'Không tìm thấy chặng đang bắt đầu.',
        );
      }

      const ordered = sortedStops(
        next.stops.filter(
          stop =>
            stop.dayIndex === target.dayIndex,
        ),
      );

      const position = ordered.findIndex(
        stop => stop.id === target.id,
      );

      const plan = [
        target,
        ...ordered
          .slice(position + 1)
          .filter(stop => !stop.completed),
      ];

      setSession({
        stops: plan,
        travelMode: mode,
      });

      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không mở được chặng.',
      );
    } finally {
      setStarting(false);
    }
  }
   const planned = currentPlan(draft);
  const editingPlace = editing
    ? findPlaceById(editing.placeId)
    : undefined;

  const completedCount = stops.filter(
    stop => stop.completed,
  ).length;
  const dayResults = stops.flatMap(stop =>
    stop.completed && stop.result ? [stop.result] : [],
  );

  const daySeconds = dayResults.reduce(
    (sum, result) => sum + result.activeSeconds,
    0,
  );

  const dayGpsResults = dayResults.filter(
    result => result.gpsMeters !== null,
  );

  const dayMeters = dayGpsResults.reduce(
    (sum, result) => sum + (result.gpsMeters ?? 0),
    0,
  );

  const allCompleted =
    draft.stops.length > 0 &&
    draft.stops.every(stop => stop.completed);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 14,
          gap: 12,
          paddingBottom: Math.max(24, insets.bottom),
          maxWidth: 680,
          width: '100%',
          alignSelf: 'center',
        }}
      >
      

        <View style={[s.card, s.between]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>
              THỜI GIAN CHUYẾN ĐI · {draft.dayCount} NGÀY
            </Text>

            <Text style={[s.title, { marginTop: 5 }]}>
              {displayDate(draft.startDate)} —{' '}
              {displayDate(
                dateForDay(
                  draft.startDate,
                  draft.dayCount - 1,
                ),
              )}
            </Text>
          </View>

                    <Action
            label="Đổi ngày ›"
            onPress={() =>
              setCalendar(true)
            }
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {Array.from(
            { length: draft.dayCount },
            (_, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Ngày ${index + 1}`}
                accessibilityState={{
                  selected: activeDay === index,
                }}
                onPress={() => setDay(index)}
                style={[
                  s.pill,
                  activeDay === index && {
                    backgroundColor: C.deep,
                    borderColor: C.deep,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color:
                      activeDay === index
                        ? '#FFF'
                        : C.muted,
                  }}
                >
                  Ngày {index + 1} (
                  {displayDate(
                    dateForDay(draft.startDate, index),
                  ).slice(0, 5)}
                  )
                </Text>
              </Pressable>
            ),
          )}
        </ScrollView>

        <View style={s.card}>
          <View style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>
                Ngày {activeDay + 1}: Khám phá Đà Nẵng
              </Text>

              <Text style={s.muted}>
                {stops.length} điểm đã chọn ·{' '}
                {completedCount} điểm đã check-in
              </Text>
            </View>

            <Action
              label="Danh sách"
              onPress={() => setSummary(true)}
            />
          </View>

                    <View
            collapsable={false}
            style={{
              height: 310,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <SelectedPlacesMap
              places={mapPlaces}
              numbers={mapPlaces.map(
                place =>
                  stops.findIndex(
                    stop =>
                      stop.placeId === place.id,
                  ) + 1,
              )}
              origin={
                draft.settings.latitude !== null &&
                draft.settings.longitude !== null
                  ? {
                      latitude:
                        draft.settings.latitude,
                      longitude:
                        draft.settings.longitude,
                    }
                  : null
              }
              travelMode={
                draft.settings.travelMode
              }
              totalStops={stops.length}
              onError={report}
            />
          </View>

          <Text style={s.muted}>
            S: xuất phát · 1, 2, 3…: thứ tự tham quan
            của ngày đang chọn.
          </Text>

          <Text style={s.muted}>
            {planned
              ? 'Đã có giờ kế hoạch. Đây là ước tính, không thay thế giờ đến thực tế.'
              : 'Chưa có kế hoạch giờ hợp lệ. Mở Cấu hình & xếp giờ để tính và lưu.'}
          </Text>
        </View>
                <Action
          label="Quản lý giờ & tối ưu chuyến"
          onPress={() =>
            setConfiguration(true)
          }
        />

        <Action
          solid
          label={
            starting
              ? 'Đang mở…'
              : draft.stops.some(stop => stop.progress)
                ? '▶ Tiếp tục chặng đang dở'
                : '▶ Bắt đầu điểm tiếp theo'
          }
          disabled={
            saving ||
            starting ||
            (
              !draft.stops.some(stop => stop.progress) &&
              !stops.some(stop => !stop.completed)
            )
          }
          onPress={() => {
            const target =
              draft.stops.find(stop => stop.progress) ??
              stops.find(stop => !stop.completed);

            if (target) void openLeg(target.id);
          }}
        />

                <Text style={s.muted}>
          Giờ lớn bên trái là giờ bắt đầu tham quan
          dự kiến. Giờ khởi hành được ghi riêng trong thẻ.
        </Text>

        <View style={s.card}>
          <Text style={s.title}>
            Kết quả Ngày {activeDay + 1}
          </Text>

          <Text style={s.muted}>
            Thời gian đi đã ghi nhận:{' '}
            {dayResults.length
              ? formatTravelTime(daySeconds)
              : 'Chưa có dữ liệu'}
          </Text>

          <Text style={s.muted}>
            Quãng đường GPS ước tính:{' '}
            {dayGpsResults.length
              ? `${(dayMeters / 1000).toFixed(2)} km`
              : 'Chưa đủ dữ liệu'}
          </Text>

          <Text style={s.muted}>
            Có kết quả ở {dayResults.length}/{completedCount} điểm
            đã check-in. Số đo có thể thiếu khi GPS yếu hoặc tạm dừng.
          </Text>

          <Action
            solid={allCompleted}
            label={
              allCompleted
                ? 'Đánh giá & tổng kết chuyến đi'
                : 'Xem tổng kết chuyến đi'
            }
            onPress={() => setResultsOpen(true)}
          />
        </View>

        {!!(error || message) && (
          <Text accessibilityRole="alert" style={s.error}>
            {message || error}
          </Text>
        )}

        <View style={s.between}>
          <Text style={[s.label, { color: C.green }]}>
            ♧ LỊCH TRÌNH CHI TIẾT 4 BUỔI
          </Text>
          <Text style={s.muted}>
            {completedCount}/{stops.length} điểm
          </Text>
        </View>

        {!draft.stops.length && (
          <View style={s.card}>
            <Text style={s.title}>
              Chưa có địa điểm trong lộ trình
            </Text>

            <Action
              solid
              label="＋ Khám phá và thêm địa điểm"
              onPress={() => router.push('/explore')}
            />
          </View>
        )}

        {PERIODS.map(period => (
          <View key={period.id} style={s.card}>
            <View style={s.between}>
              <Text style={s.title}>
                                {period.icon} {period.label} (
                {PERIOD_WINDOWS[period.id].label})
              </Text>

              <Action
                label="＋ Thêm điểm"
                onPress={() => router.push('/explore')}
              />
            </View>

                        {stops
              .filter(stop => stop.period === period.id)
              .map(stop => (
                <TripStopCard
                  key={stop.id}
                  stop={stop}
                                    plannedSchedule={
                    planned?.entries[stop.id]
                  }
                  defaultMinutes={
                    draft.settings.defaultVisitMinutes
                  }
                  disabled={saving || starting}
                  onStart={() => void openLeg(stop.id)}
                  onEdit={() => setEditing(stop)}
                  onRemove={() =>
                    void act(() =>
                      tripActions.remove(stop.id),
                    )
                  }
                  onCheckIn={() =>
                    void act(() =>
                      tripActions.checkIn(stop.id),
                    )
                  }
                  onCancel={() =>
                    void act(() => cancelLeg(stop.id))
                  }
                />
              ))}

            {!stops.some(
              stop => stop.period === period.id,
            ) && (
              <Text style={s.muted}>
                Chưa có điểm trong buổi này.
              </Text>
            )}
          </View>
        ))}

        <Text style={s.muted}>
          Bản nháp được lưu trên thiết bị.
          © OpenStreetMap contributors
        </Text>
      </ScrollView>

            {resultsOpen && (
        <TripResultsSheet
          onClose={() => setResultsOpen(false)}
        />
      )}
      {calendar && (
        <TripCalendarSheet
          close={() =>
            setCalendar(false)
          }
          onSaved={() => {
            setDay(0);
            setCalendar(false);
            setSummary(false);
            setEditing(undefined);
            setResultsOpen(false);
            setSession(null);
          }}
        />
      )}

      {configuration && (
        <TripSettingsSheet
          close={() =>
            setConfiguration(false)
          }
        />
      )}
      {summary && (
        <TripSummarySheet
          close={() => setSummary(false)}
          onEdit={stop => {
            setSummary(false);
            setEditing(stop);
          }}
        />
      )}

      {editing && editingPlace && (
        <AddStopSheet
          key={editing.id}
          place={editingPlace}
          editing={editing}
          close={() => setEditing(undefined)}
          onSaved={() => setEditing(undefined)}
        />
      )}
    </View>
  );
}